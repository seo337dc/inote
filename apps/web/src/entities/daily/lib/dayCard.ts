import type { DailyEntry, DayCard } from "../model/types";

// 서버 응답 전에 화면만 먼저 바꾸는 낙관적 업데이트용 순수 함수들 — 캐시의 DayCard를 새 객체로 돌려준다.

export function setEntryDone(card: DayCard, id: string, done: boolean): DayCard {
  return { ...card, entries: card.entries.map((e) => (e.id === id ? { ...e, done } : e)) };
}

export function appendEntry(card: DayCard, entry: DailyEntry): DayCard {
  return { ...card, entries: [...card.entries, entry] };
}

// 그날 항목을 루틴으로 만들면 그 항목이 오늘 기록이 된다 — 서버가 준 루틴 id가 오기 전에는 임시 id를 넣는다.
export function markEntryRoutine(card: DayCard, id: string, routineId: string): DayCard {
  return { ...card, entries: card.entries.map((e) => (e.id === id ? { ...e, routineId } : e)) };
}

// 루틴 이름 변경은 "오늘부터" 적용 — 호출하는 쪽이 오늘 카드의 캐시에만 쓴다. 지난 카드는 그때 이름 그대로.
export function renameRoutineEntries(card: DayCard, routineId: string, title: string): DayCard {
  return {
    ...card,
    entries: card.entries.map((e) => (e.routineId === routineId ? { ...e, title } : e)),
  };
}

export function removeRoutineEntries(card: DayCard, routineId: string): DayCard {
  return { ...card, entries: card.entries.filter((e) => e.routineId !== routineId) };
}

export function countDone(entries: DailyEntry[]): { done: number; total: number } {
  return { done: entries.filter((e) => e.done).length, total: entries.length };
}
