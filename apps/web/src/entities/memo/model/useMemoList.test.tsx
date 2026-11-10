import { describe, expect, it } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderHookWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL as URL } from "@/test/fixtures/memo";
import { sleep } from "@/test/sleep";
import { useMemoDraft } from "./useMemoDraft";
import { MEMO_MAX_COUNT } from "./constants";
import type { Memo } from "./types";

// 메모 여러 장(1:N) — docs/todo/memo.md "2차" 계약을 상태가 있는 가짜 서버로 검증한다.
const TARGET = { type: "post", id: "p1" } as const;
const DELAY = 30;

const memo = (id: string, over: Partial<Memo> = {}): Memo => makeMemo({ id, ...over });

type Call = { method: string; path: string; body?: unknown };

/** 서버 목 — 메모를 메모리에 들고 GET/POST(10장 상한 409)/PATCH/DELETE를 계약대로 흉내 낸다. */
function mockServer(initial: Memo[] = []) {
  let store = [...initial];
  let seq = 0;
  const calls: Call[] = [];
  server.use(
    http.get(URL, () => HttpResponse.json(store)),
    http.post(URL, async ({ request }) => {
      const body = (await request.json()) as Partial<Memo>;
      calls.push({ method: "POST", path: "/memos", body });
      if (store.length >= MEMO_MAX_COUNT) return HttpResponse.json({ message: "limit" }, { status: 409 });
      const created = memo(`n${++seq}`, { title: body.title ?? "", content: body.content ?? "" });
      store = [...store, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(`${URL}/:id`, async ({ request, params }) => {
      const body = (await request.json()) as Partial<Memo>;
      calls.push({ method: "PATCH", path: `/memos/${params.id}`, body });
      store = store.map((m) => (m.id === params.id ? { ...m, ...body } : m));
      return HttpResponse.json(store.find((m) => m.id === params.id));
    }),
    http.delete(`${URL}/:id`, ({ params }) => {
      calls.push({ method: "DELETE", path: `/memos/${params.id}` });
      store = store.filter((m) => m.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { calls, writes: () => calls };
}

async function setup() {
  const hook = renderHookWithQueryClient(() => useMemoDraft(TARGET, { delayMs: DELAY }));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}
const labels = (h: Awaited<ReturnType<typeof setup>>) => h.result.current.items.map((i) => i.label);

describe("useMemoDraft — 여러 장 불러오기·탭", () => {
  it("서버가 준 순서대로 탭이 되고, 제목이 비면 '메모 N'으로 보인다", async () => {
    mockServer([memo("a", { title: "할 일" }), memo("b"), memo("c", { title: "질문" })]);
    const h = await setup();
    expect(labels(h)).toEqual(["할 일", "메모 2", "질문"]);
    expect(h.result.current.activeIndex).toBe(0);
  });

  it("탭을 바꾸면 그 메모의 제목·내용이 보이고, 입력은 그 메모에만 PATCH된다", async () => {
    const { writes } = mockServer([memo("a", { content: "A내용" }), memo("b", { content: "B내용" })]);
    const h = await setup();
    expect(h.result.current.text).toBe("A내용");

    act(() => h.result.current.setActiveIndex(1));
    expect(h.result.current.text).toBe("B내용");
    act(() => h.result.current.setText("B수정"));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({ method: "PATCH", path: "/memos/b", body: { content: "B수정" } });
  });

  it("A를 고치다 B로 넘어가도 A의 변경은 A에 저장되고 B에 섞이지 않는다", async () => {
    const { writes } = mockServer([memo("a"), memo("b")]);
    const h = await setup();
    act(() => h.result.current.setText("A에 쓴 글"));
    act(() => h.result.current.setActiveIndex(1)); // 넘어가는 순간 A를 바로 저장한다
    act(() => h.result.current.setText("B에 쓴 글"));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()).toContainEqual({ method: "PATCH", path: "/memos/a", body: { content: "A에 쓴 글" } });
    expect(writes()).toContainEqual({ method: "PATCH", path: "/memos/b", body: { content: "B에 쓴 글" } });
  });

  it("제목을 고치면 title만 PATCH되고 탭 이름이 바로 바뀐다", async () => {
    const { writes } = mockServer([memo("a", { content: "본문" })]);
    const h = await setup();
    act(() => h.result.current.setTitle("새 제목"));
    expect(labels(h)).toEqual(["새 제목"]);
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body).toEqual({ title: "새 제목" });
  });

  it("메모가 하나도 없으면 빈 입력창 한 장으로 시작하고, 첫 입력 전에는 저장하지 않는다", async () => {
    const { writes } = mockServer([]);
    const h = await setup();
    expect(labels(h)).toEqual(["메모 1"]);
    expect(h.result.current.items[0].id).toBeNull();
    await act(() => sleep(DELAY * 4));
    expect(writes()).toHaveLength(0);
  });

  it("빈 상태에서 첫 입력을 하면 POST로 만들어지고, 그 id로 이어서 PATCH한다 (삭제·순서 변경에 쓰인다)", async () => {
    const { writes } = mockServer([]);
    const h = await setup();
    act(() => h.result.current.setText("첫 글"));
    await waitFor(() => expect(h.result.current.items[0].id).toBe("n1"));
    act(() => h.result.current.setText("첫 글 이어서"));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes().map((w) => w.method)).toEqual(["POST", "PATCH"]);
    expect(writes()[1].path).toBe("/memos/n1");
  });
});

describe("useMemoDraft — 추가·상한", () => {
  it("+를 누르면 바로 POST하고 맨 뒤에 새 탭이 생겨 그 탭이 열린다", async () => {
    const { writes } = mockServer([memo("a")]);
    const h = await setup();
    await act(() => h.result.current.addMemo());
    expect(writes()).toEqual([{ method: "POST", path: "/memos", body: { targetType: "post", targetId: "p1" } }]);
    expect(labels(h)).toEqual(["메모 1", "메모 2"]);
    expect(h.result.current.activeIndex).toBe(1);
    expect(h.result.current.items[1].id).toBe("n1");
  });

  it(`${MEMO_MAX_COUNT}장이 차면 canAdd가 false이고 addMemo는 요청을 보내지 않는다`, async () => {
    const { writes } = mockServer(Array.from({ length: MEMO_MAX_COUNT }, (_, i) => memo(`m${i}`)));
    const h = await setup();
    expect(h.result.current.canAdd).toBe(false);
    await act(() => h.result.current.addMemo());
    expect(writes()).toHaveLength(0);
  });

  it("서버가 409를 주면(다른 기기에서 먼저 찼을 때) 안내 문구를 보이고 목록은 그대로다", async () => {
    mockServer([memo("a")]);
    const h = await setup();
    server.use(http.post(URL, () => HttpResponse.json({ message: "limit" }, { status: 409 })));
    await act(() => h.result.current.addMemo());
    expect(h.result.current.actionError).toBe("메모는 최대 10장까지 만들 수 있습니다");
    expect(labels(h)).toEqual(["메모 1"]);
  });

  it("아직 서버에 만들어지지 않은 빈 탭이 있으면 +는 막힌다 (중복 생성 방지)", async () => {
    mockServer([]);
    const h = await setup();
    expect(h.result.current.canAdd).toBe(false);
  });
});

describe("useMemoDraft — 삭제", () => {
  it("삭제하면 DELETE를 보내고 탭이 사라지며, 열려 있던 탭이면 이웃 탭이 열린다", async () => {
    const { writes } = mockServer([memo("a", { content: "A" }), memo("b", { content: "B" })]);
    const h = await setup();
    await act(() => h.result.current.removeMemo(0));
    expect(writes()).toEqual([{ method: "DELETE", path: "/memos/a" }]);
    expect(labels(h)).toEqual(["메모 1"]);
    expect(h.result.current.text).toBe("B");
  });

  it("마지막 한 장을 지우면 빈 입력창 한 장으로 돌아간다", async () => {
    mockServer([memo("a")]);
    const h = await setup();
    await act(() => h.result.current.removeMemo(0));
    expect(h.result.current.items).toHaveLength(1);
    expect(h.result.current.items[0].id).toBeNull();
    expect(h.result.current.text).toBe("");
  });

  it("삭제한 메모에는 이후 PATCH가 나가지 않는다 (기다리던 저장도 취소)", async () => {
    const { writes } = mockServer([memo("a"), memo("b")]);
    const h = await setup();
    act(() => h.result.current.setText("지울 메모에 쓴 글"));
    await act(() => h.result.current.removeMemo(0));
    await act(() => sleep(DELAY * 4));
    expect(writes().filter((w) => w.method === "PATCH")).toHaveLength(0);
  });

  it("삭제가 실패하면 탭을 지우지 않고 안내를 보인다", async () => {
    mockServer([memo("a")]);
    const h = await setup();
    server.use(http.delete(`${URL}/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    await act(() => h.result.current.removeMemo(0));
    expect(labels(h)).toEqual(["메모 1"]);
    expect(h.result.current.actionError).toBe("메모를 삭제하지 못했습니다");
  });
});

describe("useMemoDraft — 순서 변경 (화면에서만, 저장하지 않는다)", () => {
  it("옮기면 화면 순서가 바로 바뀌고 서버에는 아무 요청도 보내지 않는다", async () => {
    const { writes } = mockServer([memo("a"), memo("b"), memo("c")]);
    const h = await setup();
    act(() => h.result.current.moveMemo(0, 2));
    expect(h.result.current.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    await act(() => sleep(DELAY * 4));
    expect(writes()).toHaveLength(0);
  });

  it("옮기는 동안 열려 있던 메모는 계속 열려 있다", async () => {
    mockServer([memo("a", { content: "A" }), memo("b", { content: "B" })]);
    const h = await setup();
    act(() => h.result.current.moveMemo(0, 1)); // 열려 있던 a가 뒤로 간다
    expect(h.result.current.activeIndex).toBe(1);
    expect(h.result.current.text).toBe("A");
  });

  it("범위를 벗어난 이동은 무시한다", async () => {
    mockServer([memo("a"), memo("b")]);
    const h = await setup();
    act(() => h.result.current.moveMemo(0, 2));
    act(() => h.result.current.moveMemo(0, -1));
    act(() => h.result.current.moveMemo(1, 1));
    expect(h.result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("옮긴 뒤에도 그 메모의 저장은 제 id로 나간다", async () => {
    const { writes } = mockServer([memo("a"), memo("b")]);
    const h = await setup();
    act(() => h.result.current.moveMemo(0, 1)); // [b, a], a가 열려 있다
    act(() => h.result.current.setText("옮긴 뒤 수정"));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ path: "/memos/a", body: { content: "옮긴 뒤 수정" } });
  });
});
