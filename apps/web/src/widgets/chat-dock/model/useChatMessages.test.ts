import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatMessages } from "./useChatMessages";
import type { ChatSession } from "./types";

vi.mock("@/shared/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, isPending: false }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

// 응답 스트림을 테스트가 직접 열고 닫을 수 있게 만든다 (실제 AI 서버에 요청하지 않는다)
function controllableStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(body, { status: 200 }),
    push: (text: string) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)),
    end: () => controller.close(),
  };
}

// /chat/stream 요청이 올 때마다 미리 만들어 둔 스트림을 순서대로 돌려준다.
// 세션 목록·대화 이력 조회는 빈 목록으로 답한다 (서버는 답변을 스트림이 끝난 뒤에 저장하므로 진행 중인 세션의 이력은 비어 있다).
function setupFetch(streams: ReturnType<typeof controllableStream>[]) {
  const queue = [...streams];
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/chat/stream")) return queue.shift()!.response;
    return new Response("[]", { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const streamCalls = (fetchMock: ReturnType<typeof setupFetch>) =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("/chat/stream")).length;

const asSession = (id: string): ChatSession => ({
  id,
  post_id: null,
  post_title: null,
  post_category: null,
  updated_at: "",
  last_message: null,
});

async function renderReady() {
  const hook = renderHook(() => useChatMessages());
  await waitFor(() => expect(hook.result.current.activeSessionId).not.toBeNull());
  return hook;
}

const texts = (messages: { text: string }[]) => messages.map((m) => m.text);

describe("useChatMessages — 세션별 동시 진행", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("A 답변이 진행 중이어도 새 대화로 옮기면 바로 전송할 수 있다", async () => {
    // 지켜주는 것: 이전 답변이 끝날 때까지 새 대화의 전송이 잠기던 문제
    const a = controllableStream();
    const b = controllableStream();
    const fetchMock = setupFetch([a, b]);
    const { result } = await renderReady();

    act(() => result.current.sendPreset("A질문"));
    await waitFor(() => expect(result.current.isSending).toBe(true));

    act(() => result.current.startNewSession());
    expect(result.current.isSending).toBe(false);
    expect(result.current.messages).toEqual([]);

    act(() => result.current.sendPreset("B질문"));
    await waitFor(() => expect(streamCalls(fetchMock)).toBe(2));
    expect(result.current.isSending).toBe(true);
  });

  it("각 세션의 답변은 자기 세션에만 쌓이고, 돌아오면 이어서 채워진다", async () => {
    // 지켜주는 것: 한 세션의 글자가 다른 세션 화면에 섞이거나, 화면을 떠난 세션의 답이 버려지는 문제
    const a = controllableStream();
    const b = controllableStream();
    setupFetch([a, b]);
    const { result } = await renderReady();
    const sessionA = result.current.activeSessionId!;

    act(() => result.current.sendPreset("A질문"));
    await waitFor(() => expect(result.current.isSending).toBe(true));
    await act(async () => a.push("A1"));

    act(() => result.current.startNewSession());
    act(() => result.current.sendPreset("B질문"));
    await waitFor(() => expect(result.current.isSending).toBe(true));
    await act(async () => {
      b.push("B1");
      a.push("A2");
    });
    await waitFor(() => expect(texts(result.current.messages)).toEqual(["B질문", "B1"]));

    await act(async () => {
      a.end();
      b.end();
    });
    await waitFor(() => expect(result.current.isSending).toBe(false));

    act(() => result.current.selectSession(asSession(sessionA)));
    await waitFor(() => expect(texts(result.current.messages)).toEqual(["A질문", "A1A2"]));
    expect(result.current.isSending).toBe(false);
  });

  it("진행 중인 세션으로 돌아와도 서버 이력(아직 비어 있음)으로 덮어쓰지 않고 계속 채워진다", async () => {
    // 지켜주는 것: 서버는 답변이 끝나야 저장하므로, 진행 중에 이력을 다시 불러와 덮어쓰면 화면의 답이 사라지는 문제
    const a = controllableStream();
    const b = controllableStream();
    setupFetch([a, b]);
    const { result } = await renderReady();
    const sessionA = result.current.activeSessionId!;

    act(() => result.current.sendPreset("A질문"));
    await waitFor(() => expect(result.current.isSending).toBe(true));
    await act(async () => a.push("A1"));

    act(() => result.current.startNewSession());
    act(() => result.current.selectSession(asSession(sessionA)));

    await waitFor(() => expect(texts(result.current.messages)).toEqual(["A질문", "A1"]));
    expect(result.current.isSending).toBe(true);

    await act(async () => {
      a.push("A2");
      a.end();
    });
    await waitFor(() => expect(texts(result.current.messages)).toEqual(["A질문", "A1A2"]));
    await waitFor(() => expect(result.current.isSending).toBe(false));
  });

  it("같은 세션에서는 답변이 끝날 때까지 추가 전송이 무시된다", async () => {
    // 지켜주는 것: 한 세션에서 두 답변이 섞여 들어오는 문제
    const a = controllableStream();
    const fetchMock = setupFetch([a]);
    const { result } = await renderReady();

    act(() => result.current.sendPreset("첫 질문"));
    await waitFor(() => expect(result.current.isSending).toBe(true));

    act(() => result.current.sendPreset("하나 더"));
    expect(streamCalls(fetchMock)).toBe(1);

    await act(async () => {
      a.push("답");
      a.end();
    });
    await waitFor(() => expect(result.current.isSending).toBe(false));
    expect(texts(result.current.messages)).toEqual(["첫 질문", "답"]);
  });

  it("답변이 진행 중인 세션 id를 내보내고, 답변이 끝나면 빠진다", async () => {
    // 지켜주는 것: 대화 목록에 "답변 중" 점을 찍을 근거. 다른 세션에 있어도 진행 중인 세션이 모두 들어 있어야 한다
    const a = controllableStream();
    const b = controllableStream();
    setupFetch([a, b]);
    const { result } = await renderReady();
    const sessionA = result.current.activeSessionId!;
    expect(result.current.answeringSessionIds.size).toBe(0);

    act(() => result.current.sendPreset("A질문"));
    await waitFor(() => expect([...result.current.answeringSessionIds]).toEqual([sessionA]));

    act(() => result.current.startNewSession());
    const sessionB = result.current.activeSessionId!;
    act(() => result.current.sendPreset("B질문"));
    await waitFor(() =>
      expect([...result.current.answeringSessionIds].sort()).toEqual([sessionA, sessionB].sort()),
    );

    await act(async () => {
      a.push("끝");
      a.end();
    });
    await waitFor(() => expect([...result.current.answeringSessionIds]).toEqual([sessionB]));

    await act(async () => b.end());
    await waitFor(() => expect(result.current.answeringSessionIds.size).toBe(0));
  });
});
