import { UNASSIGNED_CATEGORY_KEY } from "../model/types";

// 글의 카테고리를 옮길 때 캐시를 함께 고치는 순수 함수들

// 카테고리별 글 수 맵(키 = 카테고리 id)에서 from 카테고리를 하나 줄이고 to 카테고리를 하나 늘린다.
// from이 null이면 아직 지정 안 된 글이었다는 뜻이라 UNASSIGNED 칸을 줄인다.
export function moveCountKey(
  counts: Record<string, number>,
  from: string | null,
  to: string,
): Record<string, number> {
  const fromKey = from ?? UNASSIGNED_CATEGORY_KEY;
  if (fromKey === to) return counts;
  const next = { ...counts };
  if (fromKey in next) next[fromKey] = Math.max(0, next[fromKey] - 1);
  next[to] = (next[to] ?? 0) + 1;
  return next;
}

// 글 목록에서 id가 같은 글 하나의 카테고리를 바꾼다. 카테고리 경로(categoryPath)는 옛 카테고리 기준이라 틀려지므로
// 비워 둔다 — 그동안은 새 카테고리 하나로 보이고, 곧 서버 값으로 다시 맞춰진다 (getCategoryPath의 대체 동작)
export function changePostCategory<T extends { id: string; category: string; categoryId: string | null }>(
  posts: T[],
  id: string,
  to: { id: string; name: string },
): T[] {
  return posts.map((p) =>
    p.id === id ? ({ ...p, category: to.name, categoryId: to.id, categoryPath: undefined } as T) : p,
  );
}
