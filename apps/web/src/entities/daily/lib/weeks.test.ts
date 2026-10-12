import { describe, expect, it } from "vitest";
import { groupByWeek, weekOfMonth } from "./weeks";
import type { DayCard } from "../model/types";

const card = (date: string): DayCard => ({ date, entries: [] });

describe("weekOfMonth", () => {
  // 2026-10-01은 목요일 → 1~3일(목~토)이 1주차, 4일(일)부터 2주차
  it("달의 첫 주는 첫날이 속한 주이고, 일요일에 다음 주차가 시작한다", () => {
    expect(weekOfMonth("2026-10-01")).toBe(1);
    expect(weekOfMonth("2026-10-03")).toBe(1);
    expect(weekOfMonth("2026-10-04")).toBe(2);
    expect(weekOfMonth("2026-10-10")).toBe(2);
    expect(weekOfMonth("2026-10-11")).toBe(3);
    expect(weekOfMonth("2026-10-31")).toBe(5);
  });

  it("1일이 일요일이면 1일부터 7일이 1주차다", () => {
    // 2026-02-01은 일요일
    expect(weekOfMonth("2026-02-01")).toBe(1);
    expect(weekOfMonth("2026-02-07")).toBe(1);
    expect(weekOfMonth("2026-02-08")).toBe(2);
  });
});

describe("groupByWeek", () => {
  it("최신 주차부터, 주차 안에서도 최신 날짜부터 묶는다", () => {
    const groups = groupByWeek([card("2026-10-01"), card("2026-10-11"), card("2026-10-05"), card("2026-10-10")]);

    expect(groups.map((g) => [g.week, g.cards.map((c) => c.date)])).toEqual([
      [3, ["2026-10-11"]],
      [2, ["2026-10-10", "2026-10-05"]],
      [1, ["2026-10-01"]],
    ]);
  });

  it("기록이 없는 주차는 만들지 않고, 카드가 없으면 빈 배열이다", () => {
    expect(groupByWeek([card("2026-10-31"), card("2026-10-01")]).map((g) => g.week)).toEqual([5, 1]);
    expect(groupByWeek([])).toEqual([]);
  });
});
