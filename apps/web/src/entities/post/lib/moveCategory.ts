// 글의 카테고리를 옮길 때 캐시를 함께 고치는 순수 함수들

// 카테고리별 글 수 맵에서 from 카테고리를 하나 줄이고 to 카테고리를 하나 늘린다
export function moveCountKey(
  counts: Record<string, number>,
  from: string,
  to: string,
): Record<string, number> {
  if (from === to) return counts;
  const next = { ...counts };
  if (from in next) next[from] = Math.max(0, next[from] - 1);
  next[to] = (next[to] ?? 0) + 1;
  return next;
}

// 글 목록에서 id가 같은 글 하나의 category를 바꾼다. 카테고리 경로(categoryPath)는 옛 카테고리 기준이라 틀려지므로
// 비워 둔다 — 그동안은 새 카테고리 이름 하나로 보이고, 곧 서버 값으로 다시 맞춰진다 (getCategoryPath의 대체 동작)
export function changePostCategory<T extends { id: string; category: string }>(
  posts: T[],
  id: string,
  to: string,
): T[] {
  return posts.map((p) => (p.id === id ? ({ ...p, category: to, categoryPath: undefined } as T) : p));
}
