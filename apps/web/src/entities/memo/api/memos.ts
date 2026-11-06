import { api } from "@/shared/lib/api";
import type { Memo, MemoTarget } from "../model/types";

// 대상(글·독서 기록)의 내 메모 목록 — 생성순. 1차에서는 첫 번째 한 장만 쓴다.
export function getMemos(target: MemoTarget) {
  const query = new URLSearchParams({ targetType: target.type, targetId: target.id });
  return api.get<Memo[]>(`/memos?${query}`);
}

export function createMemo(target: MemoTarget, content: string) {
  return api.post<Memo>("/memos", { targetType: target.type, targetId: target.id, content });
}

export function updateMemo(id: string, content: string) {
  return api.patch<Memo>(`/memos/${id}`, { content });
}
