import { api } from "@/shared/lib/api";
import type { MyPostOutlineItem } from "../model/types";

export function getMyPostOutline() {
  return api.get<MyPostOutlineItem[]>("/blog/posts/mine/outline");
}
