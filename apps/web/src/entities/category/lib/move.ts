import type { Category } from "../model/types";
import { compareSiblings, MAX_CATEGORY_DEPTH } from "./tree";

export type DropZone = "before" | "after" | "inside";
export type MoveTarget = { parentId: string | null; index: number };

function childrenOf(list: Category[], parentId: string | null): Category[] {
  return list.filter((c) => c.parentId === parentId).sort(compareSiblings);
}

// id 자신과 그 아래 모든 하위 카테고리의 id
function subtreeIds(list: Category[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of list) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

// id 아래로 몇 단계가 더 있는지 (하위가 없으면 0)
function subtreeHeight(list: Category[], id: string): number {
  const own = list.find((c) => c.id === id);
  if (!own) return 0;
  let maxDepth = own.depth;
  subtreeIds(list, id).forEach((sid) => {
    const c = list.find((x) => x.id === sid);
    if (c && c.depth > maxDepth) maxDepth = c.depth;
  });
  return maxDepth - own.depth;
}

// parentId 밑으로 옮길 수 있는가 — 자기 자신·자기 하위 밑은 안 되고,
// 옮긴 뒤 (하위까지 포함해) 3단계를 넘어도 안 된다. parentId가 null이면 최상위.
export function canMove(list: Category[], id: string, parentId: string | null): boolean {
  if (!list.some((c) => c.id === id)) return false;
  if (parentId !== null) {
    if (subtreeIds(list, id).has(parentId)) return false;
    const parent = list.find((c) => c.id === parentId);
    if (!parent) return false;
    return parent.depth + 1 + subtreeHeight(list, id) <= MAX_CATEGORY_DEPTH;
  }
  return 1 + subtreeHeight(list, id) <= MAX_CATEGORY_DEPTH;
}

// 카테고리를 옮긴 새 목록을 만든다 (원본은 건드리지 않음). 옮길 수 없으면 null.
// index는 "옮기는 카테고리를 뺀 새 부모의 자식 목록"에서의 위치다.
export function moveCategory(list: Category[], id: string, target: MoveTarget): Category[] | null {
  if (!canMove(list, id, target.parentId)) return null;
  const moving = list.find((c) => c.id === id)!;

  const siblings = childrenOf(list, target.parentId).filter((c) => c.id !== id);
  const index = Math.min(Math.max(target.index, 0), siblings.length);
  const newOrder = [...siblings.slice(0, index), moving, ...siblings.slice(index)];

  const newParent = target.parentId ? list.find((c) => c.id === target.parentId)! : null;
  const newDepth = (newParent?.depth ?? 0) + 1;
  const depthDelta = newDepth - moving.depth;
  const movedIds = subtreeIds(list, id);

  const nextPosition = new Map<string, number>();
  newOrder.forEach((c, i) => nextPosition.set(c.id, i));
  // 다른 부모로 옮겼다면 원래 있던 자리의 빈틈도 메운다
  if (moving.parentId !== target.parentId) {
    childrenOf(list, moving.parentId)
      .filter((c) => c.id !== id)
      .forEach((c, i) => nextPosition.set(c.id, i));
  }

  return list.map((c) => {
    let next = c;
    if (c.id === id) next = { ...next, parentId: target.parentId };
    if (movedIds.has(c.id) && depthDelta !== 0) next = { ...next, depth: c.depth + depthDelta };
    const pos = nextPosition.get(c.id);
    if (pos !== undefined && pos !== c.position) next = { ...next, position: pos };
    return next;
  });
}

// 행 위에서 놓은 위치(앞/뒤/안)를 "어느 부모의 몇 번째" 목표로 바꾼다.
export function resolveDrop(
  list: Category[],
  dragId: string,
  overId: string,
  zone: DropZone,
): MoveTarget | null {
  const over = list.find((c) => c.id === overId);
  if (!over || overId === dragId) return null;

  if (zone === "inside") {
    return {
      parentId: over.id,
      index: childrenOf(list, over.id).filter((c) => c.id !== dragId).length,
    };
  }
  const siblings = childrenOf(list, over.parentId).filter((c) => c.id !== dragId);
  const at = siblings.findIndex((c) => c.id === over.id);
  return { parentId: over.parentId, index: zone === "before" ? at : at + 1 };
}

// 드래그 중 놓을 수 있는 자리인지 (규칙에 맞고, 제자리가 아닌지)
export function evaluateDrop(
  list: Category[],
  dragId: string,
  overId: string,
  zone: DropZone,
): { target: MoveTarget; valid: true } | { valid: false } {
  const target = resolveDrop(list, dragId, overId, zone);
  if (!target) return { valid: false };
  const next = moveCategory(list, dragId, target);
  if (!next) return { valid: false };
  const before = list.find((c) => c.id === dragId)!;
  const after = next.find((c) => c.id === dragId)!;
  const unchanged = before.parentId === after.parentId && before.position === after.position;
  return unchanged ? { valid: false } : { target, valid: true };
}
