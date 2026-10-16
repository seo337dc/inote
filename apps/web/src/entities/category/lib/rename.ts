import type { Category } from "../model/types";

export const MAX_CATEGORY_NAME_LENGTH = 50;

export type NameCheck = "ok" | "empty" | "too-long" | "duplicate" | "unchanged";

// 같은 부모 아래(최상위끼리 포함)의 형제 중에 같은 이름이 있는지 — 글은 카테고리 id로 가리키므로
// 다른 부모 아래에는 같은 이름('AI' 등)이 있어도 된다. exceptId는 이름을 바꾸는 자기 자신을 뺀다.
function hasSiblingNamed(list: Category[], parentId: string | null, name: string, exceptId?: string): boolean {
  return list.some((c) => c.id !== exceptId && c.parentId === parentId && c.name === name);
}

// 이름 수정 전 검사. 같은 부모 아래 형제와 이름이 겹치면 안 된다.
export function checkCategoryName(list: Category[], id: string, raw: string): NameCheck {
  const name = raw.trim();
  const current = list.find((c) => c.id === id);
  if (!name) return "empty";
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return "too-long";
  if (current && current.name === name) return "unchanged";
  if (hasSiblingNamed(list, current?.parentId ?? null, name, id)) return "duplicate";
  return "ok";
}

export type NewNameCheck = Exclude<NameCheck, "unchanged">;

// 새 카테고리를 추가하기 전 이름 검사 — 이름 수정과 같은 규칙(빈 이름·길이·같은 부모 아래 중복 금지). parentId가 없으면 최상위.
export function checkNewCategoryName(list: Category[], raw: string, parentId: string | null = null): NewNameCheck {
  const name = raw.trim();
  if (!name) return "empty";
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return "too-long";
  if (hasSiblingNamed(list, parentId, name)) return "duplicate";
  return "ok";
}

export function renameCategoryInList(list: Category[], id: string, name: string): Category[] {
  return list.map((c) => (c.id === id ? { ...c, name } : c));
}

// 글 목록에서 그 카테고리(id)에 속한 글의 category 이름 사본을 새 이름으로 바꾼다 (글 개수 맵은 id 키라 그대로다)
export function renamePostCategory<T extends { categoryId: string | null; category: string }>(
  posts: T[],
  categoryId: string,
  to: string,
): T[] {
  return posts.map((p) => (p.categoryId === categoryId ? { ...p, category: to } : p));
}
