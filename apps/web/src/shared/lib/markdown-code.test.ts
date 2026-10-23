import { describe, expect, it } from "vitest";
import { isInlineCode } from "./markdown-code";

describe("isInlineCode", () => {
  it("className도 줄바꿈도 없으면 인라인 코드다", () => {
    expect(isInlineCode(undefined, "useState")).toBe(true);
  });

  it("언어 클래스(language-xx)가 있으면 코드블록이다", () => {
    expect(isInlineCode("language-ts", "const a = 1;\n")).toBe(false);
  });

  it("언어 없는 코드블록은 끝의 줄바꿈으로 코드블록임을 알아본다", () => {
    expect(isInlineCode(undefined, "A → B\n")).toBe(false);
    expect(isInlineCode(undefined, "한 줄짜리 블록\n")).toBe(false);
  });

  it("children이 비어 있어도 에러 없이 인라인으로 본다", () => {
    expect(isInlineCode(undefined, undefined)).toBe(true);
  });
});
