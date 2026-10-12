import type { DayCard } from "../model/types";

export type WeekGroup = { week: number; cards: DayCard[] };

// 그 달의 몇 주차인지 — 달의 첫날이 속한 주가 1주차, 일요일에 시작한다(inote-money 가계부와 같은 기준).
// 1일이 수요일이면 1~4일(수~토)이 1주차, 5일(일)부터 2주차.
export function weekOfMonth(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return Math.floor((d - 1 + firstWeekday) / 7) + 1;
}

// 같은 달 카드들을 주차별로 묶는다 — 최신 주차부터, 주차 안에서도 최신 날짜부터. 기록이 없는 주차는 만들지 않는다.
export function groupByWeek(cards: DayCard[]): WeekGroup[] {
  const sorted = [...cards].sort((a, b) => (a.date < b.date ? 1 : -1));
  const groups: WeekGroup[] = [];
  for (const card of sorted) {
    const week = weekOfMonth(card.date);
    const last = groups[groups.length - 1];
    if (last && last.week === week) last.cards.push(card);
    else groups.push({ week, cards: [card] });
  }
  return groups;
}
