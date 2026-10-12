import { describe, expect, it } from "vitest";
import type { DailyEntry, DayCard } from "../model/types";
import {
  appendEntry,
  countDone,
  setEntryDone,
} from "./dayCard";

const entry = (id: string, overrides: Partial<DailyEntry> = {}): DailyEntry => ({
  id,
  date: "2026-10-12",
  title: `항목 ${id}`,
  done: false,
  ...overrides,
});

const card = (entries: DailyEntry[]): DayCard => ({ date: "2026-10-12", entries });

describe("setEntryDone", () => {
  it("해당 항목의 done만 바꾸고 다른 항목·원본은 그대로 둔다", () => {
    const original = card([entry("a"), entry("b")]);
    const next = setEntryDone(original, "a", true);

    expect(next.entries.map((e) => e.done)).toEqual([true, false]);
    expect(original.entries[0].done).toBe(false);
  });
});

describe("appendEntry", () => {
  it("항목을 맨 뒤에 붙인다", () => {
    const next = appendEntry(card([entry("a")]), entry("b"));
    expect(next.entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("countDone", () => {
  it("완료 개수와 전체 개수를 센다", () => {
    expect(countDone([entry("a", { done: true }), entry("b"), entry("c", { done: true })])).toEqual({
      done: 2,
      total: 3,
    });
  });

  it("비어 있으면 0 / 0", () => {
    expect(countDone([])).toEqual({ done: 0, total: 0 });
  });
});
