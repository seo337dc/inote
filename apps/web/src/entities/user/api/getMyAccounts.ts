import { api } from "@/shared/lib/api";
import type { LinkedAccount } from "../model/types";

export function getMyAccounts() {
  return api.get<LinkedAccount[]>("/auth/list-accounts");
}
