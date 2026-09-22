import { api } from "@/shared/lib/api";
import type { UpdateProfileInput, UserProfile } from "../model/types";

export function updateProfile(input: UpdateProfileInput) {
  return api.patch<UserProfile>("/users/me", input);
}
