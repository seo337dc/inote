import type { Category, CategoryNode } from "../model/types";

export const MAX_CATEGORY_DEPTH = 3;

// parentId 기반 평평한 목록을 트리로 조립 — DB에서 온 순서가 부모→자식 순서를
// 보장하지 않으므로, 실제 트리 구조는 여기서 다시 만든다.
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  categories.forEach((c) => nodes.set(c.id, { ...c, children: [] }));

  const roots: CategoryNode[] = [];
  categories.forEach((c) => {
    const node = nodes.get(c.id);
    if (!node) return;
    const parent = c.parentId ? nodes.get(c.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// 트리를 부모 바로 다음에 자식이 오는 순서로 펼침 — <select> 옵션 렌더링용.
export function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)]);
}
