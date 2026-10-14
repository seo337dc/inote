import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

let authState: { data: { user: { id: string } } | null; isPending: boolean } = { data: null, isPending: false };
let pathname = "/write/p1";
vi.mock("@/shared/lib/auth-client", () => ({ useSession: () => authState }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/shared/lib/api", () => ({ api: { get: vi.fn(async () => ({ title: "내 글", category: "DevOps" })) } }));

import { useChatMessages } from "./useChatMessages";
import type { ChatSession } from "./types";

const encoder = new TextEncoder();
const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const sources = [{ id: "a", title: "Docker - Volume", category: "DevOps", score: 0.62 }];
const chatAnswer = () =>
  new Response(new ReadableStream({ start: (c) => (c.enqueue(encoder.encode(sse({ text: "답" }) + "data: [DONE]\n\n")), c.close()) }), { status: 200 });

const session = (over: Partial<ChatSession> = {}): ChatSession => ({
  id: "s1",
  kind: "posts",
  post_id: null,
  post_title: null,
  post_category: null,
  updated_at: "2026-10-14T00:00:00Z",
  last_message: "**답변**",
  first_question: "옛 질문",
  ...over,
});

// 글쓰기 채팅(기본 훅)은 대화 목록·이력 불러오기를 공용 모듈로 옮긴 뒤에도 그대로 동작해야 한다
describe("useChatMessages (글쓰기 채팅)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let sessionList: ChatSession[];
  let histories: Record<string, unknown[]>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_AI_API_URL", "http://ai.test");
    authState = { data: { user: { id: "u1" } }, isPending: false };
    pathname = "/dashboard";
    sessionList = [];
    histories = {};
    fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/chat/stream")) return chatAnswer();
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

  it("로그인하면 목록을 불러오고 새 일반 대화로 시작하며, 보낼 때 그 session_id로 /chat/stream에 보낸다", async () => {
    sessionList = [session()];
    const { result } = renderHook(() => useChatMessages());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    await waitFor(() => expect(result.current.activeSessionId).toBeTruthy());
    act(() => result.current.sendPreset("질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/chat/stream"))!;
    const body = JSON.parse(call[1].body as string);
    expect(body).toMatchObject({ user_id: "u1", session_id: result.current.activeSessionId, post_id: null });
  });

  it("목록에서 대화를 고르면 이력(출처 카드 포함)을 불러온다", async () => {
    histories["s1"] = [{ role: "user", content: "질문" }, { role: "assistant", content: "답[1]", sources }];
    sessionList = [session()];
    const { result } = renderHook(() => useChatMessages());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    act(() => result.current.toggleSessionPanel());
    act(() => result.current.selectSession(sessionList[0]));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1].sources).toEqual(sources);
    expect(result.current.activeSessionId).toBe("s1");
    expect(result.current.activeSessionTitle).toBe("옛 질문");
    expect(result.current.isSessionPanelOpen).toBe(false);
  });

  it("글쓰기 페이지에서는 그 글의 id가 세션이 되고, 글 제목이 헤더 제목이 된다", async () => {
    pathname = "/write/p1";
    sessionList = [session({ id: "p1", kind: "write", post_id: "p1", post_title: "내 글", post_category: "DevOps" })];
    // 실제 앱처럼 로그인 정보가 로딩 중일 때 먼저 마운트되고, 그다음 로드가 끝난다
    authState = { data: null, isPending: true };
    const { result, rerender } = renderHook(() => useChatMessages());
    authState = { data: { user: { id: "u1" } }, isPending: false };
    rerender();
    await waitFor(() => expect(result.current.activeSessionId).toBe("p1"));
    await waitFor(() => expect(result.current.activeSessionTitle).toBe("내 글"));
  });

  it("새 대화를 시작하면 비워지고 새 id가 생긴다", async () => {
    const { result } = renderHook(() => useChatMessages());
    await waitFor(() => expect(result.current.activeSessionId).toBeTruthy());
    const before = result.current.activeSessionId;
    act(() => result.current.sendPreset("질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    act(() => result.current.startNewSession());
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeSessionId).not.toBe(before);
  });

  it("게스트는 목록이 없고 저장 없이 보낸다(user_id가 guest, session_id가 null)", async () => {
    authState = { data: null, isPending: false };
    const { result } = renderHook(() => useChatMessages());
    expect(result.current.isLoggedIn).toBe(false);
    act(() => result.current.sendPreset("질문"));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    const call = fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/chat/stream"))!;
    expect(JSON.parse(call[1].body as string)).toMatchObject({ user_id: "guest", session_id: null });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/sessions"))).toBe(false);
  });
});
