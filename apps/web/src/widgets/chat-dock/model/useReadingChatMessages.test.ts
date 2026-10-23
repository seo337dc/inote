import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useReadingChatMessages } from "./useReadingChatMessages";

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

describe("useReadingChatMessages 전송 상태", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("답변이 끝날 때까지 isSending이 true이고, 그동안의 추가 전송은 무시된다", async () => {
    const stream = controllableStream();
    const fetchMock = vi.fn().mockResolvedValue(stream.response);
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useReadingChatMessages());

    act(() => result.current.sendPreset("책 추천해줘"));
    await waitFor(() => expect(result.current.isSending).toBe(true));

    act(() => result.current.sendPreset("하나 더"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      stream.push("추천해요");
      stream.end();
    });
    await waitFor(() => expect(result.current.isSending).toBe(false));
    expect(result.current.messages.at(-1)?.text).toBe("추천해요");
  });

  it("서버 연결에 실패해도 isSending이 풀려서 다시 보낼 수 있다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { result } = renderHook(() => useReadingChatMessages());

    act(() => result.current.sendPreset("안녕"));

    await waitFor(() => expect(result.current.isSending).toBe(false));
    expect(result.current.messages.at(-1)?.text).toMatch(/연결하지 못했어요/);
  });
});
