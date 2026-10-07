import { api } from "@/shared/lib/api";
import type { UserOutline } from "../model/types";

export function getUserOutline(userId: string) {
  return api.get<UserOutline>(`/blog/posts/outline/user/${encodeURIComponent(userId)}`);
}
