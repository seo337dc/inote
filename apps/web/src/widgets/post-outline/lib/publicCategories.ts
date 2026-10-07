import type { Category } from "@/entities/category";
import type { PublicCategory } from "@/entities/post";

// 다른 사람의 카테고리(트리를 그리는 데 필요한 칸만 있음)를 트리 조립 함수가 받는 Category 모양으로 맞춘다 — 모자란 칸은 채운다
export function toCategories(authorId: string, categories: PublicCategory[]): Category[] {
  return categories.map((c) => ({ ...c, userId: authorId, position: 0, updatedAt: c.createdAt }));
}
