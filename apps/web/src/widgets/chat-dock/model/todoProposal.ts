import type { TodoProposal } from "./types";

// 서버(inote-ai)의 `todo_proposal` SSE 이벤트 값을 카드 상태로 바꾼다. 모양이 틀리거나 쓸 항목이 없으면 null.
export function parseTodoProposal(raw: unknown): TodoProposal | null {
  const items = (raw as { items?: unknown } | null | undefined)?.items;
  if (!Array.isArray(items)) return null;

  const parsed = items
    .map((item) => (typeof item?.title === "string" ? item.title.trim() : ""))
    .filter((title) => title !== "")
    .map((title) => ({ id: crypto.randomUUID(), title, selected: true }));
  if (parsed.length === 0) return null;

  return { items: parsed, status: "pending", addedCount: 0, failedCount: 0 };
}
