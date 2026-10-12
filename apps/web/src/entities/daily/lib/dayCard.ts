import type { DailyEntry, DayCard, DayCardPage } from "../model/types";

// 서버 응답 전에 화면만 먼저 바꾸는 낙관적 업데이트용 순수 함수들 — 캐시의 DayCard를 새 객체로 돌려준다.

export function setEntryDone(card: DayCard, id: string, done: boolean): DayCard {
  return { ...card, entries: card.entries.map((e) => (e.id === id ? { ...e, done } : e)) };
}

// 지난 기록 목록(여러 쪽)의 캐시에서 한 항목만 바꾼다 — 지난 카드의 체크도 낙관적으로 보이게.
export function setEntryDoneInPages<T extends { pages: DayCardPage[] }>(data: T, id: string, done: boolean): T {
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, items: page.items.map((card) => setEntryDone(card, id, done)) })),
  };
}

export function appendEntry(card: DayCard, entry: DailyEntry): DayCard {
  return { ...card, entries: [...card.entries, entry] };
}

export function countDone(entries: DailyEntry[]): { done: number; total: number } {
  return { done: entries.filter((e) => e.done).length, total: entries.length };
}
