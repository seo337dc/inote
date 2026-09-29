import { api } from "@/shared/lib/api";
import type { PostOutlineItem } from "../model/types";

export function getPostOutline() {
  return api.get<PostOutlineItem[]>("/blog/posts/outline");
}
