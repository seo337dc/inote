import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeGroupPage, makeMemo, makeMemoGroup, MEMO_GROUPS_URL, MEMOS_URL } from "@/test/fixtures/memo";
import { ApiError } from "@/shared/lib/api";
import { createMemo, deleteMemo, getMemoGroups, getMemos, updateMemo } from "./memos";

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

describe("getMemoGroups", () => {
  it("아무 조건이 없으면 쿼리 없이 GET /memos/groups를 부르고 서버가 준 페이지를 그대로 돌려준다", async () => {
    let search: URLSearchParams | undefined;
    const page = makeGroupPage([makeMemoGroup()], "next-1");
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json(page);
      }),
    );

    const result = await getMemoGroups();

    expect([...search!.keys()]).toEqual([]);
    expect(result).toEqual(page);
  });

  it("targetType·cursor·limit을 주면 쿼리로 보낸다", async () => {
    let search: URLSearchParams | undefined;
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        search = new URL(request.url).searchParams;
        return HttpResponse.json(makeGroupPage([]));
      }),
    );

    await getMemoGroups({ targetType: "post", cursor: "c1", limit: 10 });

    expect(Object.fromEntries(search!)).toEqual({ targetType: "post", cursor: "c1", limit: "10" });
  });

  it("서버 순서를 그대로 유지한다 (메모장용 재정렬을 하지 않는다)", async () => {
    server.use(
      http.get(MEMO_GROUPS_URL, () =>
        HttpResponse.json(
          makeGroupPage([
            makeMemoGroup({ targetId: "b", updatedAt: "2026-11-12T00:00:00Z" }),
            makeMemoGroup({ targetId: "a", updatedAt: "2026-11-01T00:00:00Z" }),
          ]),
        ),
      ),
    );

    expect((await getMemoGroups()).items.map((g) => g.targetId)).toEqual(["b", "a"]);
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

// 서버 없이 확인하던 목 모드는 없앴다 — 예전 환경변수(Vercel 등)가 남아 있어도 가짜 데이터를 쓰지 않고 항상 서버로 요청한다
describe("목 모드 제거 후", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("NEXT_PUBLIC_MEMOS_MOCK=true가 남아 있어도 모든 메모 API가 서버로 요청한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK", "true");
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK_EXTRA", "1000");
    const calls: string[] = [];
    server.use(
      http.get(MEMO_GROUPS_URL, () => (calls.push("groups"), HttpResponse.json(makeGroupPage([])))),
      http.get(MEMOS_URL, () => (calls.push("get"), HttpResponse.json([]))),
      http.post(MEMOS_URL, () => (calls.push("post"), HttpResponse.json(makeMemo(), { status: 201 }))),
      http.patch(`${MEMOS_URL}/:id`, () => (calls.push("patch"), HttpResponse.json(makeMemo()))),
      http.delete(`${MEMOS_URL}/:id`, () => (calls.push("delete"), new HttpResponse(null, { status: 204 }))),
    );

    await getMemoGroups();
    await getMemos({ type: "general" });
    await createMemo({ type: "general" }, {});
    await updateMemo("m1", { content: "x" });
    await deleteMemo("m1");

    expect(calls).toEqual(["groups", "get", "post", "patch", "delete"]);
  });
});
