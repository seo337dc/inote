import { describe, expect, it } from "vitest";
import { pickDate, type PickState } from "./schedule";

const idle = (startDate: string | null = null, endDate: string | null = null): PickState => ({
  startDate,
  endDate,
  picking: false,
});

describe("pickDate (달력에서 일정 고르기)", () => {
  it("처음 누른 날이 시작일이 되고, 종료일을 기다린다(아직 확정 아님)", () => {
    expect(pickDate(idle(), "2026-10-20")).toEqual({ startDate: "2026-10-20", endDate: null, picking: true, done: false });
  });

  it("그다음 더 늦은 날을 누르면 종료일이 되어 기간으로 확정된다", () => {
    const first = pickDate(idle(), "2026-10-20");
    expect(pickDate(first, "2026-10-25")).toEqual({ startDate: "2026-10-20", endDate: "2026-10-25", picking: false, done: true });
  });

  it("시작일과 같은 날을 한 번 더 누르면 하루짜리 일정(종료일 없음)으로 확정된다", () => {
    const first = pickDate(idle(), "2026-10-20");
    expect(pickDate(first, "2026-10-20")).toEqual({ startDate: "2026-10-20", endDate: null, picking: false, done: true });
  });

  it("시작일보다 앞 날짜를 누르면 그날이 새 시작일이 되고 계속 종료일을 기다린다", () => {
    const first = pickDate(idle(), "2026-10-20");
    expect(pickDate(first, "2026-10-10")).toEqual({ startDate: "2026-10-10", endDate: null, picking: true, done: false });
  });

  it("이미 일정이 있는 작업에서 날짜를 누르면 예전 일정은 버리고 새 시작일부터 다시 고른다", () => {
    expect(pickDate(idle("2026-10-01", "2026-10-30"), "2026-10-15")).toEqual({
      startDate: "2026-10-15",
      endDate: null,
      picking: true,
      done: false,
    });
  });

  it("종료일만 있는 일정은 만들어지지 않는다 (어떤 경우에도 종료일이 있으면 시작일도 있고 시작일 이후다)", () => {
    let state: PickState = idle();
    for (const day of ["2026-10-20", "2026-10-10", "2026-10-12", "2026-10-30", "2026-10-05"]) {
      const next = pickDate(state, day);
      if (next.endDate !== null) {
        expect(next.startDate).not.toBeNull();
        expect(next.endDate > next.startDate!).toBe(true);
      }
      state = next;
    }
  });
});
