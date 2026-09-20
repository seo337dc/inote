import { describe, expect, it } from "vitest";
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH } from "./validation";

describe("EMAIL_REGEX", () => {
  it("유효한 이메일 형식을 통과시킨다", () => {
    expect(EMAIL_REGEX.test("test@example.com")).toBe(true);
  });

  it("@ 이 없으면 거부한다", () => {
    expect(EMAIL_REGEX.test("test.example.com")).toBe(false);
  });

  it("도메인에 . 이 없으면 거부한다", () => {
    expect(EMAIL_REGEX.test("test@example")).toBe(false);
  });

  it("공백이 포함되면 거부한다", () => {
    expect(EMAIL_REGEX.test("te st@example.com")).toBe(false);
  });
});

describe("MIN_PASSWORD_LENGTH", () => {
  it("8이다 (better-auth 기본 정책과 동일)", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});
