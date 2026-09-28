import { api } from "@/shared/lib/api";
import type { ReadingLog } from "../model/types";

export function getMyReadingLogDrafts() {
  return api.get<ReadingLog[]>("/reading-logs/mine/drafts");
}
