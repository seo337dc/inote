import { api } from "@/shared/lib/api";
import type { MyPostListPage } from "../model/types";

export function getMyPosts(page: number, pinnedPage: number, category: string | null) {
  const params = new URLSearchParams({ page: String(page), pinnedPage: String(pinnedPage) });
  if (category) params.set("category", category);
  return api.get<MyPostListPage>(`/blog/posts/mine?${params}`);
}
