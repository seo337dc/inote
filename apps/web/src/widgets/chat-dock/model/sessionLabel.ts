import type { ChatSession, ChatSessionKind } from "./types";

// 대화 목록의 뱃지 글자 — 어느 화면에서 나눈 대화인지. 글에 묶인 글쓰기 대화는 카테고리를 함께 보여준다.
const KIND_LABELS: Record<ChatSessionKind, string> = {
  write: "일반 대화",
  posts: "글 찾기",
  reading: "독서",
  todo: "할 일",
};

/** 마크다운 기호를 걷어낸 한 줄 글자 — 답변 첫머리가 제목 자리에 `**굵게**`나 `- 목록`으로 보이지 않게 한다 */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 대화의 제목 글자 — 없으면 빈 문자열(호출하는 쪽이 대신할 글자를 정한다) */
export function sessionTitle(session: ChatSession): string {
  // 글쓰기 대화는 그 글의 제목
  if (session.post_id) return session.post_title?.trim() ?? "";
  // 첫 질문이 대화를 가장 잘 말해 준다(마지막 말은 긴 답변일 수 있다). 옛 응답에는 없을 수 있어 마지막 말로 대신한다.
  return plainText(session.first_question ?? "") || plainText(session.last_message ?? "");
}

/** 목록에 보여줄 { kicker(뱃지 줄), title } */
export function sessionLabel(session: ChatSession): { kicker: string; title: string } {
  if (session.post_id) {
    return {
      kicker: `글쓰기 · ${session.post_category || "카테고리 없음"}`,
      title: sessionTitle(session) || "제목 없음",
    };
  }
  return { kicker: KIND_LABELS[session.kind] ?? KIND_LABELS.write, title: sessionTitle(session) || "새 대화" };
}
