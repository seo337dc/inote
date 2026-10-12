import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateRange,
  formatDateTime,
  formatDayHeader,
  formatShortDate,
  fromDateString,
  toDateString,
  todayKst,
} from "./date";

describe("todayKst", () => {
  it("UTC로는 전날이어도 한국 날짜를 준다 (UTC 10/11 16:00 → 한국 10/12 01:00)", () => {
    expect(todayKst(new Date("2026-10-11T16:00:00Z"))).toBe("2026-10-12");
  });

  it("한국 자정 직전까지는 아직 그날이다 (UTC 10/11 14:59 → 한국 10/11 23:59)", () => {
    expect(todayKst(new Date("2026-10-11T14:59:00Z"))).toBe("2026-10-11");
  });
});

describe("addDays", () => {
  it("월·연을 넘겨도 날짜가 맞다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("0을 더하면 그대로다", () => {
    expect(addDays("2026-10-12", 0)).toBe("2026-10-12");
  });
});

describe("formatShortDate", () => {
  it("연도 없이 '월.일.'로 보여주고 앞자리 0은 뗀다", () => {
    expect(formatShortDate("2026-10-20")).toBe("10.20.");
    expect(formatShortDate("2026-01-05")).toBe("1.5.");
  });
});

describe("formatDateRange", () => {
  it("종료일이 없으면 시작일만, 있으면 '시작 ~ 종료'로 보여준다", () => {
    expect(formatDateRange("2026-10-20", null)).toBe("10.20.");
    expect(formatDateRange("2026-10-20", "2026-11-05")).toBe("10.20. ~ 11.5.");
  });
});

describe("toDateString / fromDateString", () => {
  it("Date ↔ 'YYYY-MM-DD'를 시간대 계산 없이 오간다 (달력 날짜 그대로)", () => {
    expect(toDateString(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(toDateString(fromDateString("2026-01-09"))).toBe("2026-01-09");
    expect(fromDateString("2026-10-05").getDate()).toBe(5);
  });
});

describe("formatDayHeader", () => {
  it("'월 일 (요일)'로 보여준다", () => {
    expect(formatDayHeader("2026-10-12")).toBe("10월 12일 (월)");
  });

  it("한 자리 월·일은 0을 채우지 않는다", () => {
    expect(formatDayHeader("2026-01-05")).toBe("1월 5일 (월)");
  });
});

describe("formatDateTime", () => {
  it("'년.월.일 시:분' 형식으로, 한 자리 숫자는 0을 채워 보여준다", () => {
    expect(formatDateTime("2026-01-05T00:07:00+09:00")).toBe("2026.01.05 00:07");
  });

  it("실행 환경 시간대와 상관없이 한국 시간으로 보여준다 (UTC 05:30 → 14:30)", () => {
    expect(formatDateTime("2026-10-02T05:30:00.000Z")).toBe("2026.10.02 14:30");
  });

  it("UTC로는 전날이어도 한국 날짜로 넘어간다 (UTC 9/30 20:00 → 10/1 05:00)", () => {
    expect(formatDateTime("2026-09-30T20:00:00.000Z")).toBe("2026.10.01 05:00");
  });
});
