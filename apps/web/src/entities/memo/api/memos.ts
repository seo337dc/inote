import { api } from "@/shared/lib/api";
import type { Memo, MemoTarget } from "../model/types";

export type MemoFields = { title?: string; content?: string };

// 대상(글·독서 기록)의 내 메모 목록 — 만든 순서. 최대 10장. 탭 순서 변경은 화면에서만 하고 저장하지 않는다.
export function getMemos(target: MemoTarget) {
  const query = new URLSearchParams({ targetType: target.type, targetId: target.id });
  return api.get<Memo[]>(`/memos?${query}`);
}

/** 새 메모 — 서버가 맨 뒤에 붙인다. 대상당 10장을 넘으면 409(ApiError). */
export function createMemo(target: MemoTarget, fields: MemoFields = {}) {
  return api.post<Memo>("/memos", { targetType: target.type, targetId: target.id, ...fields });
}

export function updateMemo(id: string, fields: MemoFields) {
  return api.patch<Memo>(`/memos/${id}`, fields);
}

export function deleteMemo(id: string) {
  return api.delete<void>(`/memos/${id}`);
}
