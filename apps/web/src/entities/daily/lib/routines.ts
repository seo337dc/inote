import type { Routine } from "../model/types";

// 고정 리스트 캐시용 순수 함수들 — 낙관적 업데이트에 쓴다.

export function addRoutine(list: Routine[], routine: Routine): Routine[] {
  return [...list, routine];
}

export function renameRoutineInList(list: Routine[], id: string, title: string): Routine[] {
  return list.map((r) => (r.id === id ? { ...r, title } : r));
}

export function removeRoutineFromList(list: Routine[], id: string): Routine[] {
  return list.filter((r) => r.id !== id);
}
