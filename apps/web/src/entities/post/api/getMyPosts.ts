import { api } from "@/shared/lib/api";
import type { MyPostListPage } from "../model/types";

export function getMyPosts(
  page: number,
  pinnedPage: number,
  category: string | null,
  q: string | null = null,
) {
  const params = new URLSearchParams({ page: String(page), pinnedPage: String(pinnedPage) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  return api.get<MyPostListPage>(`/blog/posts/mine?${params}`);
}
