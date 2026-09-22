import { api } from "@/shared/lib/api";
import type { Post } from "../model/types";

export function getMyPosts() {
  return api.get<Post[]>("/blog/posts/mine");
}
