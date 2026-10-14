import type { ChatReply, ChatSuggestion } from "./types";

/** 버튼 글자를 그대로 질문으로 보내는 시작 버튼 (text를 주면 글자와 다른 질문을 보낸다) */
export function askSuggestion(label: string, text: string = label): ChatSuggestion {
  return { label, action: { type: "ask", text } };
}

/**
 * 서버를 부르지 않고 안내로 바로 답하는 시작 버튼 — 다음에 사용자가 입력하는 내용이 실제 질문이 된다.
 * reply가 함수면 답을 만드는 동안 "조회 중"을 보여준다. searchOff면 이어지는 질문은 내 글 검색 없이 일반 답변으로 간다.
 */
export function replySuggestion(
  label: string,
  reply: string | ChatReply | (() => Promise<ChatReply>),
  options: { searchOff?: boolean } = {},
): ChatSuggestion {
  return {
    label,
    action: { type: "reply", reply: typeof reply === "string" ? { text: reply } : reply, ...(options.searchOff ? { searchOff: true } : {}) },
  };
}
