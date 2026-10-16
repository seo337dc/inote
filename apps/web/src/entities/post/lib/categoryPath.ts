import type { CategoryPathItem, Post } from "../model/types";

// 글의 카테고리 경로 — 최상위부터 이 글의 카테고리까지 (예: [{학습}, {AI}]).
// 경로를 못 받았으면 이 글의 카테고리 하나로, 카테고리도 비어 있으면 빈 배열.
export function getCategoryPath(post: Pick<Post, "category" | "categoryId" | "categoryPath">): CategoryPathItem[] {
  if (post.categoryPath?.length) return post.categoryPath;
  return post.category ? [{ id: post.categoryId, name: post.category }] : [];
}
