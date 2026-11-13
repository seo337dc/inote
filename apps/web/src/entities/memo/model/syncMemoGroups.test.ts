import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { InfiniteData } from "@tanstack/react-query";
import { makeGroupPage, makeMemo, makeMemoGroup, MEMO_GROUPS_URL, MEMOS_URL } from "@/test/fixtures/memo";
import { createTestQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import type { MemoGroupPage } from "./types";
import { mergeEditedTarget, syncMemoGroupsAfterEdit } from "./syncMemoGroups";

// 메모장을 닫은 뒤, 고친 대상의 메모만 받아 이미 받아 둔 그룹 목록(무한 스크롤 캐시)에 반영한다.
// 서버의 정렬 규칙((그룹 updatedAt 내림차순, key 내림차순))을 그대로 따른다.
const T = (day: number) => `2026-11-${String(day).padStart(2, "0")}T00:00:00Z`;
const postMemo = (id: string, updatedAt: string, over = {}) => makeMemo({ id, targetType: "post", targetId: "p1", updatedAt, ...over });
const postGroup = (targetId: string, updatedAt: string, memoIds: string[] = [`m-${targetId}`]) =>
  makeMemoGroup({
    targetType: "post",
    targetId,
    targetTitle: `글 ${targetId}`,
    updatedAt,
    memos: memoIds.map((id) => makeMemo({ id, targetType: "post", targetId, updatedAt })),
  });
const generalGroup = (id: string, updatedAt: string, content = id) =>
  makeMemoGroup({ targetType: "general", targetId: "", targetTitle: null, updatedAt, memos: [makeMemo({ id, targetType: "general", targetId: "", updatedAt, content })] });

const data = (items: ReturnType<typeof postGroup>[], nextCursor: string | null = null): InfiniteData<MemoGroupPage, string | undefined> => ({
  pages: [{ items, nextCursor }],
  pageParams: [undefined],
});
const keys = (d: InfiniteData<MemoGroupPage>) => d.pages.flatMap((p) => p.items).map((g) => g.key);

describe("mergeEditedTarget — 글·독서 메모", () => {
  const target = { type: "post", id: "p1" } as const;

  it("고친 글의 그룹을 새 메모로 바꾸고 맨 앞으로 올린다 (그룹 안 메모는 최근 수정순)", () => {
    const before = data([postGroup("p9", T(10)), postGroup("p1", T(5), ["a", "b"]), postGroup("p3", T(3))]);
    const fetched = [postMemo("a", T(5)), postMemo("b", T(12), { content: "고침" })];

    const after = mergeEditedTarget(before, target, fetched, undefined);

    expect(keys(after)).toEqual(["post:p1", "post:p9", "post:p3"]);
    const group = after.pages[0].items[0];
    expect(group.updatedAt).toBe(T(12));
    expect(group.memos.map((m) => m.id)).toEqual(["b", "a"]);
    expect(group.memos[0].content).toBe("고침");
  });

  it("대상 제목(targetTitle)은 이미 받아 둔 그룹의 것을 유지한다 (메모 API는 제목을 주지 않는다)", () => {
    const before = data([postGroup("p1", T(5))]);

    const after = mergeEditedTarget(before, target, [postMemo("m-p1", T(8))], undefined);

    expect(after.pages[0].items[0].targetTitle).toBe("글 p1");
  });

  it("메모를 새로 만들면 그룹의 메모가 늘어난다", () => {
    const before = data([postGroup("p1", T(5), ["a"])]);

    const after = mergeEditedTarget(before, target, [postMemo("a", T(5)), postMemo("new", T(9))], undefined);

    expect(after.pages[0].items[0].memos.map((m) => m.id)).toEqual(["new", "a"]);
  });

  it("그 글의 메모를 모두 지웠으면 그룹이 사라진다", () => {
    const before = data([postGroup("p9", T(10)), postGroup("p1", T(5))]);

    const after = mergeEditedTarget(before, target, [], undefined);

    expect(keys(after)).toEqual(["post:p9"]);
  });

  it("다른 그룹은 그대로 둔다", () => {
    const other = postGroup("p9", T(10));
    const before = data([other, postGroup("p1", T(5))]);

    const after = mergeEditedTarget(before, target, [postMemo("m-p1", T(6))], undefined);

    expect(after.pages[0].items.find((g) => g.key === "post:p9")).toBe(other);
  });

  it("여러 페이지로 받아 둔 목록도 한 목록으로 합쳐 정렬하고, 이어 받을 nextCursor는 마지막 페이지의 것을 유지한다", () => {
    const before: InfiniteData<MemoGroupPage, string | undefined> = {
      pages: [
        { items: [postGroup("p9", T(10)), postGroup("p8", T(9))], nextCursor: "c1" },
        { items: [postGroup("p1", T(5)), postGroup("p3", T(3))], nextCursor: "c2" },
      ],
      pageParams: [undefined, "c1"],
    };

    const after = mergeEditedTarget(before, target, [postMemo("m-p1", T(20))], undefined);

    expect(after.pages).toHaveLength(1);
    expect(keys(after)).toEqual(["post:p1", "post:p9", "post:p8", "post:p3"]);
    expect(after.pages[0].nextCursor).toBe("c2");
    expect(after.pageParams).toEqual([undefined]);
  });

  it("같은 시각이면 key 내림차순으로 정렬한다 (서버의 규칙)", () => {
    const before = data([postGroup("p1", T(5)), postGroup("p2", T(5))]);

    const after = mergeEditedTarget(before, target, [postMemo("m-p1", T(5))], undefined);

    expect(keys(after)).toEqual(["post:p2", "post:p1"]);
  });

  it("종류 탭이 이 대상과 다르면(예: 일반 탭의 목록) 그대로 돌려준다", () => {
    const before = data([generalGroup("g1", T(5))]);

    expect(mergeEditedTarget(before, target, [postMemo("a", T(9))], "general")).toBe(before);
  });

  it("같은 종류 탭이면 반영한다", () => {
    const before = data([postGroup("p1", T(5))]);

    const after = mergeEditedTarget(before, target, [postMemo("m-p1", T(9), { content: "탭" })], "post");

    expect(after.pages[0].items[0].memos[0].content).toBe("탭");
  });
});

describe("mergeEditedTarget — 일반 메모 (메모 한 장이 그룹 한 장)", () => {
  const target = { type: "general" } as const;
  const gm = (id: string, updatedAt: string, content = id) => makeMemo({ id, targetType: "general", targetId: "", updatedAt, content });

  it("고친 일반 메모의 그룹이 새 내용으로 바뀌고 맨 앞으로 온다", () => {
    const before = data([generalGroup("g1", T(10)), generalGroup("g2", T(5))]);

    const after = mergeEditedTarget(before, target, [gm("g1", T(10)), gm("g2", T(12), "고침")], undefined);

    expect(keys(after)).toEqual(["g2", "g1"]);
    expect(after.pages[0].items[0].memos[0].content).toBe("고침");
  });

  it("메모장에서 지운 일반 메모의 그룹은 사라진다", () => {
    const before = data([generalGroup("g1", T(10)), generalGroup("g2", T(5))]);

    const after = mergeEditedTarget(before, target, [gm("g1", T(10))], undefined);

    expect(keys(after)).toEqual(["g1"]);
  });

  it("메모장에서 새로 만든 일반 메모는 새 그룹으로 맨 앞에 추가된다", () => {
    const before = data([generalGroup("g1", T(10))]);

    const after = mergeEditedTarget(before, target, [gm("g1", T(10)), gm("new", T(15))], undefined);

    expect(keys(after)).toEqual(["new", "g1"]);
  });

  it("글·독서 그룹은 건드리지 않는다", () => {
    const post = postGroup("p1", T(7));
    const before = data([generalGroup("g1", T(10)), post]);

    const after = mergeEditedTarget(before, target, [gm("g1", T(10))], undefined);

    expect(after.pages[0].items).toContain(post);
  });

  it("아직 받지 않은 더 오래된 일반 메모는 목록에 끼워 넣지 않는다 (이어 받을 때 서버가 준다)", () => {
    const before = data([generalGroup("g1", T(10)), generalGroup("g2", T(8))], "next");

    const after = mergeEditedTarget(before, target, [gm("g1", T(10)), gm("g2", T(8)), gm("old", T(1))], undefined);

    expect(keys(after)).toEqual(["g1", "g2"]); // old(T1)는 받아 둔 범위(꼬리 T8)보다 오래돼서 제외
  });

  it("더 받을 페이지가 없으면(nextCursor null) 오래된 메모도 전부 넣는다", () => {
    const before = data([generalGroup("g1", T(10))], null);

    const after = mergeEditedTarget(before, target, [gm("g1", T(10)), gm("old", T(1))], undefined);

    expect(keys(after)).toEqual(["g1", "old"]);
  });

  it("목록이 비어 있으면(아직 받은 그룹이 없음) 가져온 메모를 그대로 넣는다", () => {
    const after = mergeEditedTarget(data([], null), target, [gm("a", T(3))], undefined);

    expect(keys(after)).toEqual(["a"]);
  });
});

describe("syncMemoGroupsAfterEdit — 닫은 뒤 한 번만 받아 캐시에 반영", () => {
  const target = { type: "post", id: "p1" } as const;
  const seed = (client: ReturnType<typeof createTestQueryClient>, variant: string, items = [postGroup("p9", T(10)), postGroup("p1", T(5))]) =>
    client.setQueryData(["memos", "groups", variant], data(items));
  const serveTarget = (memos: ReturnType<typeof postMemo>[]) => {
    const requested = vi.fn();
    server.use(
      http.get(MEMOS_URL, ({ request }) => {
        requested(new URL(request.url).searchParams.toString());
        return HttpResponse.json(memos);
      }),
    );
    return requested;
  };

  it("그 대상의 메모를 GET /memos로 한 번 받아 받아 둔 목록의 그룹을 바꾸고 맨 앞으로 올린다", async () => {
    const client = createTestQueryClient();
    seed(client, "all");
    const requested = serveTarget([postMemo("m-p1", T(20), { content: "방금 고침" })]);

    await syncMemoGroupsAfterEdit(client, target);

    expect(requested).toHaveBeenCalledTimes(1);
    expect(requested).toHaveBeenCalledWith("targetType=post&targetId=p1");
    const after = client.getQueryData<ReturnType<typeof data>>(["memos", "groups", "all"])!;
    expect(keys(after)).toEqual(["post:p1", "post:p9"]);
    expect(after.pages[0].items[0].memos[0].content).toBe("방금 고침");
  });

  it("그룹 목록(/memos/groups)은 다시 요청하지 않는다 — 받아 둔 모든 페이지를 다시 받지 않는다", async () => {
    const client = createTestQueryClient();
    seed(client, "all");
    serveTarget([postMemo("m-p1", T(20))]);
    const groupsRequested = vi.fn();
    server.use(http.get(MEMO_GROUPS_URL, () => (groupsRequested(), HttpResponse.json(makeGroupPage([])))));

    await syncMemoGroupsAfterEdit(client, target);

    expect(groupsRequested).not.toHaveBeenCalled();
  });

  it("전체 탭과 같은 종류 탭의 목록을 함께 갱신하고, 다른 종류 탭의 목록은 그대로 둔다", async () => {
    const client = createTestQueryClient();
    seed(client, "all");
    seed(client, "post");
    const generalItems = [generalGroup("g1", T(2))];
    seed(client, "general", generalItems as never);
    serveTarget([postMemo("m-p1", T(20))]);

    await syncMemoGroupsAfterEdit(client, target);

    expect(keys(client.getQueryData(["memos", "groups", "all"])!)).toEqual(["post:p1", "post:p9"]);
    expect(keys(client.getQueryData(["memos", "groups", "post"])!)).toEqual(["post:p1", "post:p9"]);
    expect(keys(client.getQueryData(["memos", "groups", "general"])!)).toEqual(["g1"]);
  });

  it("아직 받은 적 없는 탭(캐시 없음)은 만들지 않는다", async () => {
    const client = createTestQueryClient();
    seed(client, "all");
    serveTarget([postMemo("m-p1", T(20))]);

    await syncMemoGroupsAfterEdit(client, target);

    expect(client.getQueryData(["memos", "groups", "reading"])).toBeUndefined();
  });

  it("메모를 받지 못하면 그룹 목록을 무효화해 안전하게 다시 불러온다", async () => {
    const client = createTestQueryClient();
    seed(client, "all");
    server.use(http.get(MEMOS_URL, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await syncMemoGroupsAfterEdit(client, target);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["memos", "groups"] });
  });
});

