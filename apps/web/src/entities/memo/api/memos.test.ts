import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL } from "@/test/fixtures/memo";
import { ApiError } from "@/shared/lib/api";
import { createMemo, getAllMemos, getMemos } from "./memos";

// 계약: docs/todo/memo.md 3차 — general(일반) 메모는 targetId 없이 부른다
describe("getMemos", () => {
  it("글·독서 대상은 targetType과 targetId를 함께 보낸다 (기존 그대로)", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(MEMOS_URL, ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );

    await getMemos({ type: "post", id: "p1" });

    expect(search?.get("targetType")).toBe("post");
    expect(search?.get("targetId")).toBe("p1");
  });

  it("일반 메모는 targetType=general만 보내고 targetId는 보내지 않는다", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(MEMOS_URL, ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json([makeMemo({ targetType: "general", targetId: "" })]);
      }),
    );

    const memos = await getMemos({ type: "general" });

    expect(search?.get("targetType")).toBe("general");
    expect(search?.has("targetId")).toBe(false);
    expect(memos).toHaveLength(1);
  });
});

describe("getMemos — 정렬", () => {
  // 서버는 항상 최근 수정순으로 준다 — 메모장의 탭은 만든 순서여야 하므로 FE가 createdAt 오름차순으로 다시 정렬한다
  const SERVER_ORDER = [
    makeMemo({ id: "newest-edit", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-12T00:00:00Z" }),
    makeMemo({ id: "second-made", createdAt: "2026-11-02T00:00:00Z", updatedAt: "2026-11-05T00:00:00Z" }),
    makeMemo({ id: "first-made", createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z" }),
  ];

  it("서버가 준 순서와 상관없이 만든 순서(오래된 것부터)로 돌려준다", async () => {
    server.use(http.get(MEMOS_URL, () => HttpResponse.json(SERVER_ORDER)));

    const memos = await getMemos({ type: "post", id: "p1" });

    expect(memos.map((m) => m.id)).toEqual(["first-made", "newest-edit", "second-made"]);
  });

  it("일반 메모도 만든 순서로 정렬한다", async () => {
    server.use(http.get(MEMOS_URL, () => HttpResponse.json(SERVER_ORDER)));

    const memos = await getMemos({ type: "general" });

    expect(memos.map((m) => m.id)).toEqual(["first-made", "newest-edit", "second-made"]);
  });

  it("만든 시각이 같으면 서버가 준 순서를 유지한다", async () => {
    const same = ["a", "b", "c"].map((id) => makeMemo({ id, createdAt: "2026-11-10T00:00:00Z" }));
    server.use(http.get(MEMOS_URL, () => HttpResponse.json(same)));

    const memos = await getMemos({ type: "post", id: "p1" });

    expect(memos.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("getAllMemos — 서버 순서 유지", () => {
  it("메모 관리용 전체 조회는 서버가 준 최근 수정순을 그대로 돌려준다", async () => {
    server.use(
      http.get(MEMOS_URL, () =>
        HttpResponse.json([makeMemo({ id: "x", createdAt: "2026-11-09T00:00:00Z" }), makeMemo({ id: "y", createdAt: "2026-11-01T00:00:00Z" })]),
      ),
    );

    expect((await getAllMemos()).map((m) => m.id)).toEqual(["x", "y"]);
  });
});

describe("createMemo", () => {
  it("글·독서 대상은 본문에 targetType·targetId를 담는다 (기존 그대로)", async () => {
    let body: unknown;
    server.use(
      http.post(MEMOS_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeMemo(), { status: 201 });
      }),
    );

    await createMemo({ type: "reading", id: "r1" }, { content: "x" });

    expect(body).toEqual({ targetType: "reading", targetId: "r1", content: "x" });
  });

  it("일반 메모는 본문에 targetType만 담고 targetId는 보내지 않는다", async () => {
    let body: unknown;
    server.use(
      http.post(MEMOS_URL, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeMemo({ targetType: "general", targetId: "" }), { status: 201 });
      }),
    );

    await createMemo({ type: "general" }, { title: "t" });

    expect(body).toEqual({ targetType: "general", title: "t" });
  });

  it("일반 메모가 10장을 넘으면 409를 ApiError로 던진다", async () => {
    server.use(http.post(MEMOS_URL, () => HttpResponse.json({ message: "limit" }, { status: 409 })));

    const error = await createMemo({ type: "general" }, {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });
});
