import type { ChatMessage, ChatSource } from "./types";

// 글 찾기 채팅(inote-ai의 POST /posts-chat/stream)의 요청·응답을 다루는 순수 함수들 — 네트워크·React와 무관해서 단독으로 테스트한다.
// 서버가 SSE로 보내는 것:
//   data: {"text": "..."}                                                  답변 조각 (여러 번)
//   data: {"sources": [...], "mode": "posts"|"general", "search": "..."}   마지막에 한 번
//   data: [DONE]

// 서버의 한도와 맞춘다 (넘으면 서버가 422로 거절)
export const MAX_QUERY_CHARS = 1000;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_HISTORY = 10;

export type PostsChatSearch = "found" | "none" | "unavailable";

export type PostsChatEvent =
  | { type: "text"; text: string }
  | { type: "final"; sources: ChatSource[]; mode: "posts" | "general"; search: PostsChatSearch };

function toSource(value: unknown): ChatSource | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.title !== "string") return null;
  return {
    id: v.id,
    title: v.title,
    category: typeof v.category === "string" ? v.category : "",
    score: typeof v.score === "number" ? v.score : 0,
  };
}

// SSE 이벤트 한 덩이("data: ...")를 해석한다. [DONE]·빈 줄·알 수 없는 모양은 null.
export function parsePostsChatChunk(chunk: string): PostsChatEvent | null {
  const line = chunk.split("\n").find((l) => l.startsWith("data:"));
  if (!line) return null;
  const payload = line.slice("data:".length).trim();
  if (!payload || payload === "[DONE]") return null;

  let json: unknown;
  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;

  if (typeof o.text === "string") return { type: "text", text: o.text };

  if (Array.isArray(o.sources)) {
    const search = o.search === "found" || o.search === "none" ? o.search : "unavailable";
    return {
      type: "final",
      sources: o.sources.map(toSource).filter((s): s is ChatSource => s !== null),
      mode: o.mode === "posts" ? "posts" : "general",
      search,
    };
  }
  return null;
}

// 스트림에서 이벤트를 차례로 꺼낸다. 네트워크 조각이 이벤트 경계(빈 줄)나 한글 글자 중간에서 잘려도 제대로 이어 붙인다.
export async function* readPostsChatStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<PostsChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = parsePostsChatChunk(chunk);
      if (event) yield event;
    }
  }

  // 마지막 이벤트가 빈 줄 없이 끝났어도 놓치지 않는다
  buffer += decoder.decode();
  const last = parsePostsChatChunk(buffer);
  if (last) yield last;
}

// 서버로 보낼 대화: 비어 있는 메시지(실패한 답변 등)는 빼고, 최근 MAX_HISTORY개만, 한 메시지는 MAX_MESSAGE_CHARS자까지.
export function toRequestMessages(history: ChatMessage[]): { role: ChatMessage["role"]; content: string }[] {
  return history
    .filter((m) => m.text.trim() !== "")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.text.slice(0, MAX_MESSAGE_CHARS) }));
}
