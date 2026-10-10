import type { Category, CategoryNode } from "../model/types";

export const MAX_CATEGORY_DEPTH = 3;

// 같은 부모 안에서는 position 순서, 같으면 만든 순서. (position이 없는 옛 응답은 0으로 보고 만든 순서만 따른다)
export function compareSiblings(a: Category, b: Category): number {
  return (a.position ?? 0) - (b.position ?? 0) || a.createdAt.localeCompare(b.createdAt);
}

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
  const sortRecursively = (list: CategoryNode[]) => {
    list.sort(compareSiblings);
    list.forEach((n) => sortRecursively(n.children));
  };
  sortRecursively(roots);
  return roots;
}

// 트리를 부모 바로 다음에 자식이 오는 순서로 펼침 — <select> 옵션 렌더링용.
export function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategoryTree(node.children)]);
}

// 카테고리별 글 수를 하위 카테고리까지 합친 값으로 바꾼다 (그 카테고리를 눌렀을 때 목록에 나오는 글 수와 같게).
// directCounts는 정확히 그 카테고리에 속한 글 수(글의 카테고리는 이름 문자열이라 이름으로 센다). 없는 이름은 0.
export function rollupCategoryCounts(
  tree: CategoryNode[],
  directCounts: Record<string, number>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const sum = (node: CategoryNode): number => {
    const total = (directCounts[node.name] ?? 0) + node.children.reduce((acc, child) => acc + sum(child), 0);
    counts[node.name] = total;
    return total;
  };
  tree.forEach(sum);
  return counts;
}
