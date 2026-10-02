import { describe, expect, it } from "vitest";
import { formatDateTime } from "./date";

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
