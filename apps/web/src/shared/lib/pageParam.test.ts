import { describe, expect, it } from "vitest";
import { toPageNumber } from "./pageParam";

describe("toPageNumber", () => {
  it("정상적인 숫자 문자열은 그 숫자를 돌려준다", () => {
    expect(toPageNumber("3")).toBe(3);
  });

  it("없거나 숫자가 아니면 1이다", () => {
    expect(toPageNumber(undefined)).toBe(1);
    expect(toPageNumber("abc")).toBe(1);
    expect(toPageNumber("")).toBe(1);
  });

  it("0·음수는 1로 올리고, 소수는 내린다", () => {
    expect(toPageNumber("0")).toBe(1);
    expect(toPageNumber("-4")).toBe(1);
    expect(toPageNumber("2.9")).toBe(2);
  });

  it("같은 파라미터가 여러 번 오면 첫 번째 값을 쓴다", () => {
    expect(toPageNumber(["5", "7"])).toBe(5);
  });
});
