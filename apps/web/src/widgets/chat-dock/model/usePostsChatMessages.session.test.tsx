import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// 로그인 상태를 시험이 바꿀 수 있게 가짜로 대체한다
let authState: { data: { user: { id: string } } | null; isPending: boolean } = { data: null, isPending: false };
vi.mock("@/shared/lib/auth-client", () => ({ useSession: () => authState }));

import { usePostsChatMessages } from "./usePostsChatMessages";
import type { ChatSession } from "./types";

const encoder = new TextEncoder();
const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const sources = [{ id: "a", title: "Docker - Volume", category: "DevOps", score: 0.62 }];

const stream = (body: string) =>
  new Response(new ReadableStream({ start: (c) => (c.enqueue(encoder.encode(body)), c.close()) }), { status: 200 });
const answer = () => stream(sse({ text: "답" }) + sse({ sources: [], mode: "general", search: "none" }) + "data: [DONE]\n\n");

const session = (over: Partial<ChatSession> = {}): ChatSession => ({
  id: "s-old",
  kind: "posts",
  post_id: null,
  post_title: null,
  post_category: null,
  updated_at: "2026-10-14T00:00:00Z",
  last_message: "답",
  first_question: "옛 질문",
  ...over,
});

describe("usePostsChatMessages 대화 저장·히스토리", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let sessionList: ChatSession[];
  let histories: Record<string, unknown[]>;

  const streamCalls = () => fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/posts-chat/stream"));
  const streamBody = (n = -1) => JSON.parse(streamCalls().at(n)![1].body as string);

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_AI_API_URL", "http://ai.test");
    authState = { data: { user: { id: "u1" } }, isPending: false };
    sessionList = [];
    histories = {};
    fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/posts-chat/stream")) return answer();
      if (url.includes("/sessions")) return Response.json(sessionList);
      const m = url.match(/\/conversations\/([^?]+)/);
      if (m) return Response.json(histories[m[1]] ?? []);
      throw new Error("unexpected " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("로그인했으면 isLoggedIn이 참이라 대화 목록 버튼이 보이고, 마운트하면 목록을 불러온다", async () => {
    sessionList = [session()];
    const { result } = renderHook(() => usePostsChatMessages());
    expect(result.current.isLoggedIn).toBe(true);
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(fetchMock.mock.calls[0][0]).toBe("http://ai.test/sessions?user_id=u1");
  });

  it("질문을 보낼 때 user_id와 같은 session_id를 함께 보내고, 같은 대화 안에서는 id가 유지된다", async () => {
    const { result } = renderHook(() => usePostsChatMessages());
    act(() => result.current.sendPreset("첫 질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    const first = streamBody();
    expect(first.user_id).toBe("u1");
    expect(typeof first.session_id).toBe("string");
    expect(result.current.activeSessionId).toBe(first.session_id);

    act(() => result.current.sendPreset("두 번째 질문"));
    await waitFor(() => expect(result.current.messages[3]?.text).toBe("답"));
    expect(streamBody().session_id).toBe(first.session_id);
  });

  it("보낸 뒤에 목록을 다시 불러온다 (방금 나눈 대화가 바로 보이도록)", async () => {
    const { result } = renderHook(() => usePostsChatMessages());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const before = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/sessions")).length;
    act(() => result.current.sendPreset("질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    await waitFor(() => expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes("/sessions")).length).toBe(before + 1));
  });

  it("게스트는 id를 보내지 않고(저장 안 됨) 목록도 불러오지 않는다", async () => {
    authState = { data: null, isPending: false };
    const { result } = renderHook(() => usePostsChatMessages());
    expect(result.current.isLoggedIn).toBe(false);
    act(() => result.current.sendPreset("질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    const body = streamBody();
    expect(body).not.toHaveProperty("user_id");
    expect(body).not.toHaveProperty("session_id");
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/sessions"))).toBe(false);
  });

  it("새 대화를 시작하면 대화가 비워지고 다음 질문은 새 session_id로 간다", async () => {
    const { result } = renderHook(() => usePostsChatMessages());
    act(() => result.current.sendPreset("첫 질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    const firstId = streamBody().session_id;
    act(() => result.current.toggleSessionPanel());
    act(() => result.current.startNewSession());
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.isSessionPanelOpen).toBe(false); // 새 대화를 시작하면 패널이 닫힌다
    act(() => result.current.sendPreset("다른 질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    expect(streamBody().session_id).not.toBe(firstId);
  });

  it("목록에서 고른 대화의 이력(출처 카드 포함)을 불러오고, 이어서 질문하면 그 대화에 저장된다", async () => {
    histories["s-old"] = [
      { role: "user", content: "모니터링 글 있어?" },
      { role: "assistant", content: "있어요[1]", sources },
    ];
    sessionList = [session()];
    const { result } = renderHook(() => usePostsChatMessages());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    act(() => result.current.toggleSessionPanel());
    act(() => result.current.selectSession(sessionList[0]));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1].sources).toEqual(sources);
    expect(result.current.messages[0].sources).toBeUndefined();
    expect(result.current.activeSessionId).toBe("s-old");
    expect(result.current.activeSessionTitle).toBe("옛 질문");
    expect(result.current.isSessionPanelOpen).toBe(false);
    expect(fetchMock.mock.calls.some((c) => c[0] === "http://ai.test/conversations/s-old?user_id=u1")).toBe(true);

    act(() => result.current.sendPreset("이어서 질문"));
    await waitFor(() => expect(result.current.messages[3]?.text).toBe("답"));
    const body = streamBody();
    expect(body.session_id).toBe("s-old");
    // 이전 대화(이력)도 함께 보내서 이어서 답하게 한다
    expect(body.messages.map((m: { content: string }) => m.content)).toEqual(["모니터링 글 있어?", "있어요[1]", "이어서 질문"]);
  });

  it("다른 화면(글쓰기)에서 나눈 대화도 열 수 있다", async () => {
    const writeSession = session({ id: "s-write", kind: "write", first_question: "글쓰기 질문" });
    histories["s-write"] = [{ role: "user", content: "글쓰기 질문" }, { role: "assistant", content: "글쓰기 답" }];
    sessionList = [writeSession];
    const { result } = renderHook(() => usePostsChatMessages());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    act(() => result.current.selectSession(writeSession));
    await waitFor(() => expect(result.current.messages.map((m) => m.text)).toEqual(["글쓰기 질문", "글쓰기 답"]));
  });

  it("이력을 못 불러오면 빈 대화로 둔다", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/sessions")) return Response.json([session()]);
      return new Response("err", { status: 500 });
    });
    const { result } = renderHook(() => usePostsChatMessages());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    act(() => result.current.selectSession(session()));
    await act(async () => {});
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeSessionId).toBe("s-old");
  });

  it("대화를 빠르게 갈아타면 늦게 도착한 이전 대화의 이력이 덮어쓰지 않는다", async () => {
    let releaseA!: (r: Response) => void;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/sessions")) return Promise.resolve(Response.json([]));
      if (url.includes("/conversations/A")) return new Promise<Response>((r) => (releaseA = r));
      if (url.includes("/conversations/B")) return Promise.resolve(Response.json([{ role: "user", content: "B 대화" }]));
      throw new Error("unexpected " + url);
    });
    const { result } = renderHook(() => usePostsChatMessages());
    act(() => result.current.selectSession(session({ id: "A" })));
    act(() => result.current.selectSession(session({ id: "B" })));
    await waitFor(() => expect(result.current.messages.map((m) => m.text)).toEqual(["B 대화"]));
    await act(async () => releaseA(Response.json([{ role: "user", content: "A 대화" }])));
    expect(result.current.messages.map((m) => m.text)).toEqual(["B 대화"]);
    expect(result.current.activeSessionId).toBe("B");
  });

  it("헤더 제목: 방금 시작한 대화는 첫 질문, 목록에 생기면 목록의 제목(마크다운 제거)", async () => {
    const { result, rerender } = renderHook(() => usePostsChatMessages());
    act(() => result.current.sendPreset("모니터링 글 있어?"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    expect(result.current.activeSessionTitle).toBe("모니터링 글 있어?");
    sessionList = [session({ id: result.current.activeSessionId!, first_question: null, last_message: "**관련 글**이 있어요" })];
    act(() => result.current.toggleSessionPanel()); // 패널을 열면 목록을 다시 불러온다
    await waitFor(() => expect(result.current.sessions).toHaveLength(1), { timeout: 2000 });
    rerender();
    expect(result.current.activeSessionTitle).toBe("관련 글이 있어요");
  });
});
