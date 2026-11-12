import { api } from "@/shared/lib/api";
import { isMemosMock, mockMemoApi } from "../model/mock";
import type { Memo, MemoTarget } from "../model/types";

// 서버는 항상 최근 수정순으로 준다. 메모장의 탭은 만든 순서여야 하므로 대상별 조회는 여기서 createdAt 오름차순으로 다시 정렬한다
// (같은 시각이면 서버 순서 유지 — 정렬은 안정적이다). 메모 관리용 전체 조회는 서버 순서 그대로 쓴다.
function byCreatedAt(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// 일반 메모는 targetType만 보낸다 (targetId 없음)
function targetParams(target: MemoTarget): Record<string, string> {
  return target.type === "general" ? { targetType: "general" } : { targetType: target.type, targetId: target.id };
}

export type MemoFields = { title?: string; content?: string };

// 대상(글·독서 기록·일반)의 내 메모 목록 — 만든 순서(위 byCreatedAt). 최대 10장. 탭 순서 변경은 화면에서만 하고 저장하지 않는다.
export function getMemos(target: MemoTarget) {
  if (isMemosMock()) return mockMemoApi.get(target);
  return api.get<Memo[]>(`/memos?${new URLSearchParams(targetParams(target))}`).then(byCreatedAt);
}

/** 새 메모 — 서버가 맨 뒤에 붙인다. 대상당(일반 메모는 전체) 10장을 넘으면 409(ApiError). */
export function createMemo(target: MemoTarget, fields: MemoFields = {}) {
  if (isMemosMock()) return mockMemoApi.create(target, fields);
  return api.post<Memo>("/memos", { ...targetParams(target), ...fields });
}

export function updateMemo(id: string, fields: MemoFields) {
  if (isMemosMock()) return mockMemoApi.update(id, fields);
  return api.patch<Memo>(`/memos/${id}`, fields);
}

export function deleteMemo(id: string) {
  if (isMemosMock()) return mockMemoApi.remove(id);
  return api.delete<void>(`/memos/${id}`);
}

/** 내 메모 전체 — 최근 수정순. 각 메모에는 대상 글·독서의 제목(targetTitle)이 붙는다(일반 메모는 null). 계약: docs/todo/memo.md 3차 */
export function getAllMemos() {
  if (isMemosMock()) return mockMemoApi.getAll();
  return api.get<Memo[]>("/memos");
}
