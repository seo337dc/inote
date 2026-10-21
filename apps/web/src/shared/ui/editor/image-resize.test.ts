import { describe, expect, it } from "vitest";
import { clampWidthPercent, parseWidthPercent, widthPercentAfterDrag } from "./image-resize";

describe("clampWidthPercent", () => {
  it("10~100 사이로 맞추고 정수로 반올림한다", () => {
    expect(clampWidthPercent(5)).toBe(10);
    expect(clampWidthPercent(150)).toBe(100);
    expect(clampWidthPercent(59.6)).toBe(60);
  });

  it("숫자가 아니면 100이다", () => {
    expect(clampWidthPercent(Number.NaN)).toBe(100);
  });
});

describe("widthPercentAfterDrag", () => {
  it("오른쪽으로 끌면 커지고 왼쪽으로 끌면 작아진다", () => {
    expect(widthPercentAfterDrag(400, 100, 1000)).toBe(50);
    expect(widthPercentAfterDrag(400, -100, 1000)).toBe(30);
  });

  it("본문 폭을 넘거나 너무 작아지면 범위 안으로 맞춘다", () => {
    expect(widthPercentAfterDrag(400, 900, 1000)).toBe(100);
    expect(widthPercentAfterDrag(400, -390, 1000)).toBe(10);
  });

  it("본문 폭을 모르면 100이다", () => {
    expect(widthPercentAfterDrag(400, 100, 0)).toBe(100);
  });
});

describe("parseWidthPercent", () => {
  it("style의 % 너비를 읽는다", () => {
    expect(parseWidthPercent("width: 60%")).toBe(60);
    expect(parseWidthPercent("max-width: 100%; width: 45%;")).toBe(45);
  });

  it("%가 아니거나 없으면 null이다", () => {
    expect(parseWidthPercent("width: 300px")).toBeNull();
    expect(parseWidthPercent("max-width: 50%")).toBeNull();
    expect(parseWidthPercent(null)).toBeNull();
  });
});
