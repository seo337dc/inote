import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePostsChatMessages } from "./usePostsChatMessages";
import { useReadingChatMessages } from "./useReadingChatMessages";

const encoder = new TextEncoder();
const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const sources = [{ id: "a", title: "Docker - Volume", category: "DevOps", score: 0.62 }];

function okResponse(body: string): Response {
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(body));
        c.close();
      },
    }),
    { status: 200 },
  );
}

// 시험이 직접 조각을 밀어 넣는 스트림 (답변이 오는 도중 상태를 보려고)
function openStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({ start: (c) => (controller = c) });
  return {
    response: new Response(stream, { status: 200 }),
    push: (s: string) => controller.enqueue(encoder.encode(s)),
    close: () => controller.close(),
    fail: () => controller.error(new Error("network")),
  };
}

const lastRequest = (fetchMock: ReturnType<typeof vi.fn>, n = -1) => {
  const call = fetchMock.mock.calls.at(n)!;
  return { url: call[0] as string, init: call[1] as RequestInit, body: JSON.parse(call[1].body as string) };
};

describe("usePostsChatMessages", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_AI_API_URL", "http://ai.test");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const ask = async (result: { current: ReturnType<typeof usePostsChatMessages> }, text: string) => {
    act(() => result.current.sendPreset(text));
  };

  it("질문을 /posts-chat/stream으로 보내고 답변을 이어 붙이며 출처를 붙인다", async () => {
    fetchMock.mockResolvedValue(
      okResponse(sse({ text: "도커 볼륨은 " }) + sse({ text: "데이터를 보존합니다[1]." }) + sse({ sources, mode: "posts", search: "found" }) + "data: [DONE]\n\n"),
    );
    const { result } = renderHook(() => usePostsChatMessages());

    await ask(result, "도커 볼륨이 뭐야?");

    await waitFor(() => expect(result.current.messages[1].sources).toEqual(sources));
    expect(result.current.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(result.current.messages[0].text).toBe("도커 볼륨이 뭐야?");
    expect(result.current.messages[1].text).toBe("도커 볼륨은 데이터를 보존합니다[1].");
    const { url, init, body } = lastRequest(fetchMock);
    expect(url).toBe("http://ai.test/posts-chat/stream");
    expect(init.method).toBe("POST");
    expect(body).toEqual({ messages: [{ role: "user", content: "도커 볼륨이 뭐야?" }] });
  });

  it("일반 답변(내 글에 없음)이면 출처를 붙이지 않는다", async () => {
    fetchMock.mockResolvedValue(
      okResponse(sse({ text: "내 글에는 관련 내용이 없어요.\n\n" }) + sse({ text: "일반 답변" }) + sse({ sources: [], mode: "general", search: "none" })),
    );
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "내일 날씨");
    await waitFor(() => expect(result.current.messages[1].text).toContain("일반 답변"));
    expect(result.current.messages[1].text.startsWith("내 글에는 관련 내용이 없어요.")).toBe(true);
    expect(result.current.messages[1].sources).toBeUndefined();
  });

  it("이전 대화를 함께 보낸다", async () => {
    fetchMock.mockImplementation(async () => okResponse(sse({ text: "답" }) + sse({ sources: [], mode: "general", search: "none" })));
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "첫 질문");
    await waitFor(() => expect(result.current.messages[1].text).toBe("답"));
    await ask(result, "두 번째 질문");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(lastRequest(fetchMock).body.messages).toEqual([
      { role: "user", content: "첫 질문" },
      { role: "assistant", content: "답" },
      { role: "user", content: "두 번째 질문" },
    ]);
  });

  it("입력창은 보내면 비워진다 / 공백만 있으면 보내지 않는다", async () => {
    fetchMock.mockResolvedValue(okResponse(sse({ text: "답" })));
    const { result } = renderHook(() => usePostsChatMessages());
    act(() => result.current.setInput("  "));
    await ask(result, "   ");
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => result.current.setInput("질문"));
    await ask(result, "질문");
    await waitFor(() => expect(result.current.input).toBe(""));
  });

  describe("실패해도 화면이 깨지지 않고 알려준다", () => {
    it("네트워크 오류", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "질문");
      await waitFor(() => expect(result.current.messages[1].text).toContain("연결하지 못했어요"));
    });

    it("422(질문이 서버 규칙에 맞지 않음)와 그 외 오류는 다른 안내를 준다", async () => {
      fetchMock.mockResolvedValueOnce(new Response("{}", { status: 422 }));
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "첫 질문");
      await waitFor(() => expect(result.current.messages[1].text).toContain("이해하지 못했어요"));
      fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
      await ask(result, "두 번째 질문");
      await waitFor(() => expect(result.current.messages[3].text).toContain("가져오지 못했어요"));
    });

    it("실패 뒤에도 다음 질문을 보낼 수 있다", async () => {
      fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
      fetchMock.mockResolvedValueOnce(okResponse(sse({ text: "이번엔 성공" })));
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "첫 질문");
      await waitFor(() => expect(result.current.messages[1].text).toContain("가져오지 못했어요"));
      await ask(result, "다시");
      await waitFor(() => expect(result.current.messages[3].text).toBe("이번엔 성공"));
      // 실패한 빈 답변·오류 안내가 서버로 가는 대화에 섞이지 않는다 (안내 문구는 assistant 메시지로 남지만 길이 제한 안에서 보낸다)
      expect(lastRequest(fetchMock).body.messages.at(-1)).toEqual({ role: "user", content: "다시" });
    });

    it("답변 도중 연결이 끊기면 받은 만큼 두고 끊겼다고 알려준다", async () => {
      const s = openStream();
      fetchMock.mockResolvedValue(s.response);
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "질문");
      await act(async () => s.push(sse({ text: "받은 앞부분" })));
      await waitFor(() => expect(result.current.messages[1].text).toBe("받은 앞부분"));
      await act(async () => s.fail());
      await waitFor(() => expect(result.current.messages[1].text).toContain("중간에 끊겼어요"));
      expect(result.current.messages[1].text.startsWith("받은 앞부분")).toBe(true);
    });

    it("아무것도 받기 전에 끊기면 일반 오류 안내를 준다", async () => {
      const s = openStream();
      fetchMock.mockResolvedValue(s.response);
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "질문");
      await act(async () => s.fail());
      await waitFor(() => expect(result.current.messages[1].text).toContain("가져오지 못했어요"));
    });
  });

  it("답변을 기다리는 동안 답변 말풍선은 비어 있고(조회 중 표시), 끝나면 글자가 채워진다", async () => {
    const s = openStream();
    fetchMock.mockResolvedValue(s.response);
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "질문");
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]).toMatchObject({ role: "assistant", text: "" });
    await act(async () => {
      s.push(sse({ text: "답" }));
      s.push("data: [DONE]\n\n");
      s.close();
    });
    await waitFor(() => expect(result.current.messages[1].text).toBe("답"));
  });

  it("모델이 빈 답변을 줘도 '조회 중'으로 남지 않고 안내 문구로 바뀐다", async () => {
    fetchMock.mockResolvedValue(okResponse(sse({ sources: [], mode: "general", search: "none" }) + "data: [DONE]\n\n"));
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "질문");
    await waitFor(() => expect(result.current.messages[1].text).toContain("답변이 비어 있어요"));
  });

  it("1000자를 넘는 질문은 서버로 보내지 않고 바로 알려준다", async () => {
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "가".repeat(1001));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages[1].text).toContain("1,000자까지");
    // 정확히 1000자는 보낸다
    fetchMock.mockResolvedValue(okResponse(sse({ text: "답" })));
    await ask(result, "나".repeat(1000));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("답변이 오는 도중에 또 보내도 한 번만 전송된다", async () => {
    const s = openStream();
    fetchMock.mockResolvedValue(s.response);
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "첫 질문");
    await ask(result, "성급한 두 번째 질문");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toHaveLength(2);
    await act(async () => {
      s.push(sse({ text: "답" }));
      s.close();
    });
    await waitFor(() => expect(result.current.messages[1].text).toBe("답"));
    // 끝난 뒤에는 다시 보낼 수 있다
    fetchMock.mockResolvedValue(okResponse(sse({ text: "두 번째 답" })));
    await ask(result, "두 번째 질문");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("새 대화를 시작하면 대화를 비우고 진행 중인 요청을 끊는다", async () => {
    const s = openStream();
    fetchMock.mockResolvedValue(s.response);
    const { result } = renderHook(() => usePostsChatMessages());
    await ask(result, "질문");
    const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    act(() => result.current.startNewSession());
    expect(signal.aborted).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    // 끊긴 요청이 오류 안내를 남기지 않고, 새 질문은 바로 보낼 수 있다
    fetchMock.mockResolvedValue(okResponse(sse({ text: "새 답" })));
    await ask(result, "새 질문");
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("새 답"));
    expect(result.current.messages).toHaveLength(2);
  });

  it("헤더 제목은 첫 질문이고 세션 목록은 항상 비어 있다", async () => {
    fetchMock.mockResolvedValue(okResponse(sse({ text: "답" })));
    const { result } = renderHook(() => usePostsChatMessages());
    expect(result.current.activeSessionTitle).toBeNull();
    await ask(result, "  도커 질문  ");
    await waitFor(() => expect(result.current.activeSessionTitle).toBe("도커 질문"));
    expect(result.current.sessions).toEqual([]);
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("글 목록 화면의 시작 버튼 3개를 돌려준다", () => {
    const { result } = renderHook(() => usePostsChatMessages());
    expect(result.current.suggestions.map((s) => s.label)).toEqual(["글을 쓰고 싶어", "글을 찾아줘", "과제나 업무 도와줘"]);
  });

  it("시작 버튼을 고르면 action의 text를 질문으로 보낸다 (버튼 글자와 달라도 된다)", async () => {
    fetchMock.mockResolvedValue(okResponse(sse({ text: "답" }) + "data: [DONE]\n\n"));
    const { result } = renderHook(() => usePostsChatMessages());
    act(() => result.current.selectSuggestion({ label: "글을 찾아줘", action: { type: "ask", text: "내 글에서 찾아줘" } }));
    await waitFor(() => expect(result.current.messages[1]?.text).toBe("답"));
    expect(result.current.messages[0].text).toBe("내 글에서 찾아줘");
    expect(lastRequest(fetchMock).body.messages[0].content).toBe("내 글에서 찾아줘");
  });

  describe("'글을 찾아줘' 시작 버튼 — 서버를 부르지 않고 안내만 보여준다", () => {
    const findButton = (result: { current: ReturnType<typeof usePostsChatMessages> }) =>
      result.current.suggestions.find((s) => s.label === "글을 찾아줘")!;

    it("버튼 글자가 사용자 말, 안내 문구가 답변으로 들어가고 요청은 보내지 않는다", () => {
      const { result } = renderHook(() => usePostsChatMessages());
      act(() => result.current.selectSuggestion(findButton(result)));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.messages.map((m) => [m.role, m.local])).toEqual([["user", true], ["assistant", true]]);
      expect(result.current.messages[0].text).toBe("글을 찾아줘");
      expect(result.current.messages[1].text).toContain("어떤 내용을 찾으신가요?");
    });

    it("이어서 입력한 질문을 보낼 때 안내 대화는 서버로 보내지 않는다", async () => {
      fetchMock.mockResolvedValue(okResponse(sse({ text: "답" }) + "data: [DONE]\n\n"));
      const { result } = renderHook(() => usePostsChatMessages());
      act(() => result.current.selectSuggestion(findButton(result)));
      await ask(result, "도커 볼륨");
      await waitFor(() => expect(result.current.messages[3]?.text).toBe("답"));
      expect(lastRequest(fetchMock).body).toEqual({ messages: [{ role: "user", content: "도커 볼륨" }] });
      expect(result.current.messages).toHaveLength(4); // 안내 2개 + 질문·답변은 화면에 그대로 남는다
    });

    it("답변이 오는 도중에는 안내를 끼워 넣지 않는다", async () => {
      const s = openStream();
      fetchMock.mockResolvedValue(s.response);
      const { result } = renderHook(() => usePostsChatMessages());
      await ask(result, "질문");
      await waitFor(() => expect(result.current.messages).toHaveLength(2));
      act(() => result.current.selectSuggestion(findButton(result)));
      expect(result.current.messages).toHaveLength(2);
      await act(async () => {
        s.close();
      });
    });
  });

  it("기존 채팅 UI가 그대로 쓸 수 있게 독서 모드 훅과 같은 항목을 돌려준다", () => {
    const posts = renderHook(() => usePostsChatMessages()).result.current;
    const reading = renderHook(() => useReadingChatMessages()).result.current;
    expect(Object.keys(posts).sort()).toEqual(Object.keys(reading).sort());
  });
});
