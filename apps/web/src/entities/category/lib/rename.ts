import type { Category } from "../model/types";

export const MAX_CATEGORY_NAME_LENGTH = 50;

export type NameCheck = "ok" | "empty" | "too-long" | "duplicate" | "unchanged";

// 이름 수정 전 검사. 내 카테고리 사이에서 이름이 겹치면 안 된다
// (글이 카테고리를 이름 문자열로 가리키기 때문에 이름이 같으면 어느 쪽인지 구분할 수 없음).
export function checkCategoryName(list: Category[], id: string, raw: string): NameCheck {
  const name = raw.trim();
  const current = list.find((c) => c.id === id);
  if (!name) return "empty";
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return "too-long";
  if (current && current.name === name) return "unchanged";
  if (list.some((c) => c.id !== id && c.name === name)) return "duplicate";
  return "ok";
}

export type NewNameCheck = Exclude<NameCheck, "unchanged">;

// 새 카테고리를 추가하기 전 이름 검사 — 이름 수정과 같은 규칙(빈 이름·길이·내 카테고리 사이 중복 금지)
export function checkNewCategoryName(list: Category[], raw: string): NewNameCheck {
  const name = raw.trim();
  if (!name) return "empty";
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return "too-long";
  if (list.some((c) => c.name === name)) return "duplicate";
  return "ok";
}

export function renameCategoryInList(list: Category[], id: string, name: string): Category[] {
  return list.map((c) => (c.id === id ? { ...c, name } : c));
}

// 카테고리별 글 수 맵에서 옛 이름 키를 새 이름으로 옮긴다 (새 이름 키가 이미 있으면 합산)
export function renameCountKey(
  counts: Record<string, number>,
  from: string,
  to: string,
): Record<string, number> {
  if (!(from in counts)) return counts;
  const { [from]: moved, ...rest } = counts;
  return { ...rest, [to]: (rest[to] ?? 0) + moved };
}

// 글 목록에서 옛 카테고리 이름을 가진 글의 category를 새 이름으로 바꾼다
export function renamePostCategory<T extends { category: string }>(
  posts: T[],
  from: string,
  to: string,
): T[] {
  return posts.map((p) => (p.category === from ? { ...p, category: to } : p));
}
