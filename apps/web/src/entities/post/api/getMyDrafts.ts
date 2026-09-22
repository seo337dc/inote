import { api } from "@/shared/lib/api";
import type { Post } from "../model/types";

export function getMyDrafts() {
  return api.get<Post[]>("/blog/posts/mine/drafts");
}
