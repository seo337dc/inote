import { api } from "@/shared/lib/api";

export function setPassword(newPassword: string) {
  return api.post<{ success: true }>("/users/set-password", { newPassword });
}
