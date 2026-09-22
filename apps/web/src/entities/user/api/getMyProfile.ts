import { api } from "@/shared/lib/api";
import type { UserProfile } from "../model/types";

export function getMyProfile() {
  return api.get<UserProfile>("/users/me");
}
