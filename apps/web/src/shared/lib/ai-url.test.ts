import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "./ai-url";

describe("normalizeBaseUrl", () => {
  it("끝에 /가 없으면 그대로 둔다", () => {
    expect(normalizeBaseUrl("https://inote-ai-cyan.vercel.app")).toBe(
      "https://inote-ai-cyan.vercel.app",
    );
  });

  it("끝의 /를 제거한다 (//sessions 로 요청돼 308이 나는 것을 막는다)", () => {
    expect(normalizeBaseUrl("https://inote-ai-cyan.vercel.app/")).toBe(
      "https://inote-ai-cyan.vercel.app",
    );
  });

  it("끝의 /가 여러 개여도 모두 제거한다", () => {
    expect(normalizeBaseUrl("https://inote-ai-cyan.vercel.app///")).toBe(
      "https://inote-ai-cyan.vercel.app",
    );
  });

  it("경로가 있는 주소는 끝의 /만 제거한다", () => {
    expect(normalizeBaseUrl("http://localhost:8000/api/")).toBe("http://localhost:8000/api");
  });

  it("값이 없으면 빈 문자열을 돌려준다", () => {
    expect(normalizeBaseUrl(undefined)).toBe("");
  });
});
