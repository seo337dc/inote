import { buildCategoryTree, flattenCategoryTree, type Category, type CategoryNode } from "@/entities/category";
import type { PublicCategory } from "@/entities/post";

export type UserCategoryFilter = {
  // 트리 순서대로 펼친 카테고리 (이름, 깊이)
  options: { name: string; depth: number }[];
  // 카테고리별 공개 글 수 — 하위 카테고리 글까지 합친 값 (그 카테고리를 눌렀을 때 나오는 글 수와 같다)
  counts: Record<string, number>;
  // 그 사람의 공개 글 전체 수
  total: number;
};

// BE가 준 다른 사람의 카테고리(공개 글이 있는 것만)와 직속 글 수로 사이드바에 쓸 값을 만든다.
// 트리 조립 함수가 내 카테고리 모양(Category)을 받아서, 모자란 칸은 채워 맞춘다.
export function buildUserCategoryFilter(
  authorId: string,
  categories: PublicCategory[],
  directCounts: Record<string, number>,
): UserCategoryFilter {
  const asCategories: Category[] = categories.map((c) => ({
    ...c,
    userId: authorId,
    position: 0,
    updatedAt: c.createdAt,
  }));
  const tree = buildCategoryTree(asCategories);

  const counts: Record<string, number> = {};
  const sum = (node: CategoryNode): number => {
    const total = (directCounts[node.name] ?? 0) + node.children.reduce((acc, child) => acc + sum(child), 0);
    counts[node.name] = total;
    return total;
  };
  tree.forEach(sum);

  return {
    options: flattenCategoryTree(tree).map((node) => ({ name: node.name, depth: node.depth })),
    counts,
    total: Object.values(directCounts).reduce((acc, n) => acc + n, 0),
  };
}
