import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useMemoDraft } from "./useMemoDraft";
import { MEMO_AUTOSAVE_MS } from "./memoSaver";
import type { Memo } from "./types";

const URL = `${TEST_API_URL}/api/v1/memos`;
const TARGET = { type: "post", id: "p1" } as const;
const DELAY = 30; // 실제 1.5초를 기다리지 않도록 짧게 준다 (MEMO_AUTOSAVE_MS는 아래에서 값만 확인)

const memo = (over: Partial<Memo> = {}): Memo => ({
  id: "m1",
  targetType: "post",
  targetId: "p1",
  content: "",
  createdAt: "2026-11-05T00:00:00Z",
  updatedAt: "2026-11-05T00:00:00Z",
  ...over,
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Call = { method: string; url: string; body?: unknown };

// 서버 목: GET은 list를 돌려주고, POST/PATCH는 호출을 기록한다. 필요하면 handlers로 응답을 덮어쓴다.
function mockMemos(opts: { list?: Memo[]; postDelay?: number } = {}) {
  const calls: Call[] = [];
  const log: string[] = []; // 요청 시작/끝 순서
  server.use(
    http.get(URL, ({ request }) => {
      calls.push({ method: "GET", url: request.url });
      return HttpResponse.json(opts.list ?? []);
    }),
    http.post(URL, async ({ request }) => {
      const body = (await request.json()) as { content: string };
      calls.push({ method: "POST", url: request.url, body });
      log.push("POST:start");
      if (opts.postDelay) await sleep(opts.postDelay);
      log.push("POST:end");
      return HttpResponse.json(memo({ id: "new1", content: body.content }), { status: 201 });
    }),
    http.patch(`${URL}/:id`, async ({ request, params }) => {
      const body = (await request.json()) as { content: string };
      calls.push({ method: "PATCH", url: request.url, body: { id: params.id, ...body } });
      log.push("PATCH");
      return HttpResponse.json(memo({ id: String(params.id), content: body.content }));
    }),
  );
  return { calls, log, writes: () => calls.filter((c) => c.method !== "GET") };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMemoDraft(TARGET, { delayMs: DELAY }), { wrapper });
}

async function ready(hook: ReturnType<typeof setup>) {
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
}

describe("useMemoDraft — 불러오기", () => {
  it("자동저장 지연 기본값은 1.5초다 (계약)", () => {
    expect(MEMO_AUTOSAVE_MS).toBe(1500);
  });

  it("대상의 내 메모를 GET /memos?targetType&targetId로 불러와 첫 장을 보여준다", async () => {
    const { calls } = mockMemos({ list: [memo({ content: "저장된 메모" }), memo({ id: "m2", content: "둘째" })] });
    const hook = setup();

    expect(hook.result.current.ready).toBe(false); // 불러오는 동안은 편집 금지
    await ready(hook);

    expect(hook.result.current.text).toBe("저장된 메모");
    const get = calls.find((c) => c.method === "GET")!;
    expect(new globalThis.URL(get.url).searchParams.get("targetType")).toBe("post");
    expect(new globalThis.URL(get.url).searchParams.get("targetId")).toBe("p1");
  });

  it("메모가 없으면 빈 내용으로 시작하고, 불러온 것만으로는 아무것도 저장하지 않는다", async () => {
    const { writes } = mockMemos({ list: [] });
    const hook = setup();
    await ready(hook);

    expect(hook.result.current.text).toBe("");
    await act(() => sleep(DELAY * 4));
    expect(writes()).toHaveLength(0);
  });

  it("불러오기에 실패하면 ready가 false로 남고 입력해도 저장하지 않는다 (이미 있는 메모와 중복 생성 방지)", async () => {
    const { writes } = mockMemos();
    server.use(http.get(URL, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    const hook = setup();

    await waitFor(() => expect(hook.result.current.loadFailed).toBe(true));
    expect(hook.result.current.ready).toBe(false);
    act(() => hook.result.current.setText("써 본다"));
    await act(() => sleep(DELAY * 4));
    expect(writes()).toHaveLength(0);
  });
});

describe("useMemoDraft — 저장", () => {
  it("메모가 없을 때 처음 입력하면 지연 뒤 POST /memos를 한 번 보낸다", async () => {
    const { writes } = mockMemos({ list: [] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("첫 메모"));
    expect(hook.result.current.text).toBe("첫 메모"); // 화면은 바로 바뀐다
    expect(writes()).toHaveLength(0); // 디바운스 중

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ method: "POST", body: { targetType: "post", targetId: "p1", content: "첫 메모" } });
    await waitFor(() => expect(hook.result.current.status).toBe("saved"));
  });

  it("그 뒤의 입력은 POST가 돌려준 id로 PATCH /memos/:id를 보낸다 (또 만들지 않는다)", async () => {
    const { writes } = mockMemos({ list: [] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("하나"));
    await waitFor(() => expect(hook.result.current.status).toBe("saved"));
    act(() => hook.result.current.setText("하나 둘"));
    await waitFor(() => expect(writes()).toHaveLength(2));

    expect(writes().map((c) => c.method)).toEqual(["POST", "PATCH"]);
    expect(writes()[1].body).toEqual({ id: "new1", content: "하나 둘" });
  });

  it("이미 서버에 메모가 있으면 첫 입력부터 PATCH다 (POST하지 않는다)", async () => {
    const { writes } = mockMemos({ list: [memo({ content: "원래 내용" })] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("원래 내용 + 추가"));
    await waitFor(() => expect(writes()).toHaveLength(1));

    expect(writes()[0]).toMatchObject({ method: "PATCH", body: { id: "m1", content: "원래 내용 + 추가" } });
  });

  it("연속으로 입력하면 디바운스로 합쳐져 마지막 값 하나만 보낸다", async () => {
    const { writes } = mockMemos({ list: [memo({ content: "" })] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("가"));
    await act(() => sleep(DELAY / 3));
    act(() => hook.result.current.setText("가나"));
    await act(() => sleep(DELAY / 3));
    act(() => hook.result.current.setText("가나다"));

    await waitFor(() => expect(writes()).toHaveLength(1));
    await act(() => sleep(DELAY * 3));
    expect(writes()).toHaveLength(1);
    expect(writes()[0].body).toEqual({ id: "m1", content: "가나다" });
  });

  it("POST 응답이 오기 전에 입력이 더 들어와도 PATCH는 POST가 끝난 뒤에 나간다 (순서 보장)", async () => {
    const { writes, log } = mockMemos({ list: [], postDelay: DELAY * 4 });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("첫"));
    await waitFor(() => expect(log).toContain("POST:start"));
    act(() => hook.result.current.setText("첫 둘째")); // POST가 아직 진행 중
    await act(() => sleep(DELAY * 2)); // 디바운스가 지나도 POST 중이라 PATCH는 아직 없다
    expect(log).not.toContain("PATCH");

    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(log).toEqual(["POST:start", "POST:end", "PATCH"]);
    expect(writes()[1].body).toEqual({ id: "new1", content: "첫 둘째" });
  });

  it("내용을 모두 지우면 삭제가 아니라 빈 내용으로 PATCH한다", async () => {
    const { writes } = mockMemos({ list: [memo({ content: "지울 내용" })] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText(""));
    await waitFor(() => expect(writes()).toHaveLength(1));

    expect(writes()[0]).toMatchObject({ method: "PATCH", body: { id: "m1", content: "" } });
  });

  it("메모가 없는 채로 입력했다가 다시 비우면 아무것도 보내지 않는다 (빈 행 방지)", async () => {
    const { writes } = mockMemos({ list: [] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("a"));
    act(() => hook.result.current.setText(""));
    await act(() => sleep(DELAY * 4));

    expect(writes()).toHaveLength(0);
  });

  it("서버에 저장된 내용과 같은 값으로 돌아오면 보내지 않는다", async () => {
    const { writes } = mockMemos({ list: [memo({ content: "그대로" })] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("그대로 바뀜"));
    act(() => hook.result.current.setText("그대로"));
    await act(() => sleep(DELAY * 4));

    expect(writes()).toHaveLength(0);
  });
});

describe("useMemoDraft — 저장 시점", () => {
  it("flush()를 부르면 기다리지 않고 바로 저장한다 (패널을 닫을 때)", async () => {
    const { writes } = mockMemos({ list: [memo()] });
    const hook = setup();
    await ready(hook);

    act(() => {
      hook.result.current.setText("닫기 직전");
      hook.result.current.flush();
    });

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body).toEqual({ id: "m1", content: "닫기 직전" });
  });

  it("화면을 떠날 때(언마운트) 디바운스에 걸려 있던 변경을 보낸다", async () => {
    const { writes } = mockMemos({ list: [memo()] });
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("떠나기 직전"));
    hook.unmount();

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body).toEqual({ id: "m1", content: "떠나기 직전" });
  });
});

describe("useMemoDraft — 실패", () => {
  it("저장이 실패하면 status가 error가 되고, 다음 입력에서 다시 시도해 성공하면 saved가 된다", async () => {
    mockMemos({ list: [memo()] });
    let fail = true;
    const attempts: unknown[] = [];
    server.use(
      http.patch(`${URL}/:id`, async ({ request }) => {
        attempts.push(await request.json());
        if (fail) return HttpResponse.json({ message: "실패" }, { status: 500 });
        return HttpResponse.json(memo({ content: "복구" }));
      }),
    );
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("시도"));
    await waitFor(() => expect(hook.result.current.status).toBe("error"));
    expect(hook.result.current.text).toBe("시도"); // 입력은 잃지 않는다

    fail = false;
    act(() => hook.result.current.setText("시도 다시"));
    await waitFor(() => expect(hook.result.current.status).toBe("saved"));
    expect(attempts).toEqual([{ content: "시도" }, { content: "시도 다시" }]);
  });

  it("첫 POST가 실패해도 다음 입력에서 다시 POST한다 (id가 없으니 PATCH하지 않는다)", async () => {
    const { writes } = mockMemos({ list: [] });
    let fail = true;
    server.use(
      http.post(URL, async ({ request }) => {
        const body = (await request.json()) as { content: string };
        if (fail) return HttpResponse.json({ message: "실패" }, { status: 500 });
        return HttpResponse.json(memo({ id: "new1", content: body.content }), { status: 201 });
      }),
    );
    const hook = setup();
    await ready(hook);

    act(() => hook.result.current.setText("처음"));
    await waitFor(() => expect(hook.result.current.status).toBe("error"));
    fail = false;
    act(() => hook.result.current.setText("처음 다시"));
    await waitFor(() => expect(hook.result.current.status).toBe("saved"));

    expect(writes().filter((c) => c.method === "PATCH")).toHaveLength(0);
  });
});
