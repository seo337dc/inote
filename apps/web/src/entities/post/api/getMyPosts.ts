import { api } from "@/shared/lib/api";
import type { MyPostListPage } from "../model/types";

// archived가 true면 보관함(보관한 글만, 보관 시각 최신순), 아니면 보관한 글을 뺀 나의 글
export function getMyPosts(
  page: number,
  pinnedPage: number,
  categoryId: string | null,
  q: string | null = null,
  archived = false,
) {
  const params = new URLSearchParams({ page: String(page), pinnedPage: String(pinnedPage) });
  if (categoryId) params.set("categoryId", categoryId);
  if (q) params.set("q", q);
  if (archived) params.set("archived", "true");
  return api.get<MyPostListPage>(`/blog/posts/mine?${params}`);
}
