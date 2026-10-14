import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY,
  MAX_MESSAGE_CHARS,
  parsePostsChatChunk,
  readPostsChatStream,
  toRequestMessages,
  type PostsChatEvent,
} from "./postsChatStream";
import type { ChatMessage } from "./types";

const encoder = new TextEncoder();

// 바이트 조각 목록으로 스트림을 만든다 (조각을 임의 위치에서 자르는 시험용)
function streamOf(parts: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const p of parts) controller.enqueue(p);
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<PostsChatEvent[]> {
  const events: PostsChatEvent[] = [];
  for await (const e of readPostsChatStream(stream)) events.push(e);
  return events;
}

const final = { sources: [{ id: "a", title: "Docker", category: "DevOps", score: 0.62 }], mode: "posts", search: "found" };

describe("parsePostsChatChunk", () => {
  it("text 이벤트를 해석한다", () => {
    expect(parsePostsChatChunk('data: {"text": "안녕"}')).toEqual({ type: "text", text: "안녕" });
  });

  it("서버가 한글을 \\u 이스케이프로 보내도 풀어서 읽는다", () => {
    expect(parsePostsChatChunk('data: {"text": "\\ub3c4\\ucee4"}')).toEqual({ type: "text", text: "도커" });
  });

  it("마지막 sources 이벤트를 해석한다", () => {
    expect(parsePostsChatChunk(`data: ${JSON.stringify(final)}`)).toEqual({
      type: "final",
      sources: [{ id: "a", title: "Docker", category: "DevOps", score: 0.62 }],
      mode: "posts",
      search: "found",
    });
  });

  it("mode가 없거나 이상하면 general, search가 이상하면 unavailable로 본다", () => {
    expect(parsePostsChatChunk('data: {"sources": [], "mode": "x", "search": "?"}')).toEqual({
      type: "final",
      sources: [],
      mode: "general",
      search: "unavailable",
    });
    expect(parsePostsChatChunk('data: {"sources": [], "mode": "general", "search": "none"}')).toMatchObject({
      mode: "general",
      search: "none",
    });
  });

  it("출처 항목 중 id·title이 문자열이 아닌 것은 버리고, 없는 category·score는 기본값을 쓴다", () => {
    const event = parsePostsChatChunk(
      'data: {"sources": [{"id": "a", "title": "A"}, {"id": 1, "title": "B"}, {"title": "C"}, null, "x", {"id": "d", "title": "D", "category": 5, "score": "0.5"}]}',
    );
    expect(event).toMatchObject({
      type: "final",
      sources: [
        { id: "a", title: "A", category: "", score: 0 },
        { id: "d", title: "D", category: "", score: 0 },
      ],
    });
  });

  it("id는 문자열인데 title이 문자열이 아닌 출처도 버린다", () => {
    const event = parsePostsChatChunk('data: {"sources": [{"id": "e", "title": 5}, {"id": "f", "title": null}, {"id": "g", "title": "G"}]}');
    expect(event).toMatchObject({ type: "final", sources: [{ id: "g", title: "G" }] });
  });

  it("[DONE]·빈 덩이·data가 아닌 줄·깨진 JSON·알 수 없는 모양은 null이다", () => {
    for (const chunk of ["data: [DONE]", "", ": keep-alive", "data: ", "data: {깨짐", "data: 123", 'data: "문자열"', "data: null", 'data: {"other": 1}']) {
      expect(parsePostsChatChunk(chunk), chunk).toBeNull();
    }
  });
});

describe("readPostsChatStream", () => {
  const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

  it("이벤트를 순서대로 꺼내고 [DONE]은 건너뛴다", async () => {
    const body = sse({ text: "도커 볼륨은 " }) + sse({ text: "데이터를 보존합니다" }) + sse(final) + "data: [DONE]\n\n";
    const events = await collect(streamOf([encoder.encode(body)]));
    expect(events.map((e) => e.type)).toEqual(["text", "text", "final"]);
    expect(events[0]).toEqual({ type: "text", text: "도커 볼륨은 " });
  });

  it("조각이 이벤트 경계 중간에서 잘려도 이어 붙인다", () => {
    const bytes = encoder.encode(sse({ text: "가나다" }) + sse({ text: "라마바" }));
    // 모든 위치에서 한 번씩 잘라 본다
    return Promise.all(
      Array.from({ length: bytes.length - 1 }, (_, i) => i + 1).map(async (cut) => {
        const events = await collect(streamOf([bytes.slice(0, cut), bytes.slice(cut)]));
        expect(events, `cut=${cut}`).toEqual([
          { type: "text", text: "가나다" },
          { type: "text", text: "라마바" },
        ]);
      }),
    );
  });

  it("서버가 \\u 이스케이프 없이 한글을 그대로 보내고 그 글자의 바이트 중간에서 잘려도 깨지지 않는다", async () => {
    const bytes = encoder.encode('data: {"text": "도커 볼륨"}\n\n');
    const cut = bytes.indexOf(0xeb) + 1; // '도'의 UTF-8 3바이트 중 첫 바이트 바로 뒤
    const events = await collect(streamOf([bytes.slice(0, cut), bytes.slice(cut)]));
    expect(events).toEqual([{ type: "text", text: "도커 볼륨" }]);
  });

  it("마지막 이벤트가 빈 줄 없이 끝나도 놓치지 않는다", async () => {
    const events = await collect(streamOf([encoder.encode(sse({ text: "앞" }) + `data: ${JSON.stringify(final)}`)]));
    expect(events.map((e) => e.type)).toEqual(["text", "final"]);
  });

  it("한 번에 여러 이벤트가 와도, 이벤트마다 따로 와도 같은 결과다", async () => {
    const parts = [sse({ text: "1" }), sse({ text: "2" }), sse({ text: "3" })];
    const together = await collect(streamOf([encoder.encode(parts.join(""))]));
    const apart = await collect(streamOf(parts.map((p) => encoder.encode(p))));
    expect(together).toEqual(apart);
    expect(together).toHaveLength(3);
  });

  it("빈 스트림이면 이벤트가 없다", async () => {
    expect(await collect(streamOf([]))).toEqual([]);
  });
});

describe("toRequestMessages", () => {
  const msg = (role: ChatMessage["role"], text: string, i = 0): ChatMessage => ({ id: String(i), role, text });

  it("role과 text를 서버 모양(role, content)으로 바꾼다", () => {
    expect(toRequestMessages([msg("user", "질문"), msg("assistant", "답")])).toEqual([
      { role: "user", content: "질문" },
      { role: "assistant", content: "답" },
    ]);
  });

  it("비어 있는 메시지(실패한 답변)는 보내지 않는다", () => {
    expect(toRequestMessages([msg("user", "질문"), msg("assistant", ""), msg("user", "  ")])).toEqual([
      { role: "user", content: "질문" },
    ]);
  });

  it(`최근 ${MAX_HISTORY}개만 보낸다`, () => {
    const history = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => msg(i % 2 === 0 ? "user" : "assistant", `m${i}`, i));
    const sent = toRequestMessages(history);
    expect(sent).toHaveLength(MAX_HISTORY);
    expect(sent[0].content).toBe("m5");
    expect(sent[sent.length - 1].content).toBe(`m${MAX_HISTORY + 4}`);
  });

  it(`한 메시지는 ${MAX_MESSAGE_CHARS}자까지만 보낸다 (긴 답변이 다음 요청을 거절당하게 만들지 않도록)`, () => {
    const [sent] = toRequestMessages([msg("assistant", "가".repeat(MAX_MESSAGE_CHARS + 500))]);
    expect(sent.content).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it("출처 같은 화면용 필드는 서버로 보내지 않는다", () => {
    const withSources: ChatMessage = { ...msg("assistant", "답"), sources: [{ id: "a", title: "A", category: "", score: 1 }] };
    expect(Object.keys(toRequestMessages([withSources])[0]).sort()).toEqual(["content", "role"]);
  });
});

describe("toRequestMessages — 화면이 직접 채운 말풍선", () => {
  it("local 메시지는 서버로 보내지 않는다", () => {
    const history = [
      { id: "1", role: "user" as const, text: "글을 찾아줘", local: true },
      { id: "2", role: "assistant" as const, text: "어떤 내용을 찾으신가요?", local: true },
      { id: "3", role: "user" as const, text: "도커 볼륨" },
    ];
    expect(toRequestMessages(history)).toEqual([{ role: "user", content: "도커 볼륨" }]);
  });
});
