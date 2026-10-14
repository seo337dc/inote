import type { ChatSuggestion } from "./types";

/** 서버를 부르지 않고 안내 문구로 바로 답하는 시작 버튼 — 다음에 사용자가 입력하는 내용이 실제 질문이 된다 */
export function replySuggestion(label: string, text: string): ChatSuggestion {
  return { label, action: { type: "reply", text } };
}

/** 버튼 글자를 그대로 질문으로 보내는 시작 버튼 (text를 주면 글자와 다른 질문을 보낸다) */
export function askSuggestion(label: string, text: string = label): ChatSuggestion {
  return { label, action: { type: "ask", text } };
}
