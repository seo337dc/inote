import { describe, expect, it } from "vitest";
import { toPageNumber, toSearchQuery } from "./pageParam";

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

describe("toSearchQuery", () => {
  it("앞뒤 공백을 지운 검색어를 돌려준다", () => {
    expect(toSearchQuery("  리액트 ")).toBe("리액트");
  });

  it("없거나 공백뿐이면 null이다 (검색 안 함)", () => {
    expect(toSearchQuery(undefined)).toBeNull();
    expect(toSearchQuery("")).toBeNull();
    expect(toSearchQuery("   ")).toBeNull();
  });

  it("같은 이름이 여러 번 오면 첫 번째 값을 쓴다", () => {
    expect(toSearchQuery(["a", "b"])).toBe("a");
  });

  it("100자를 넘으면 100자까지만 쓴다", () => {
    expect(toSearchQuery("가".repeat(150))).toHaveLength(100);
  });
});
