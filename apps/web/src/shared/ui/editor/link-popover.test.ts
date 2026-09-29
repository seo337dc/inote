import { describe, expect, it } from "vitest";
import { normalizeHref } from "./link-popover";

describe("normalizeHref", () => {
  it("스킴이 없으면 https://를 붙인다", () => {
    expect(normalizeHref("example.com/a")).toBe("https://example.com/a");
  });

  it("http(s)/mailto/tel 같은 스킴이 있으면 그대로 둔다", () => {
    expect(normalizeHref("http://a.com")).toBe("http://a.com");
    expect(normalizeHref("mailto:me@a.com")).toBe("mailto:me@a.com");
    expect(normalizeHref("tel:010")).toBe("tel:010");
  });

  it("내부 경로(/…)와 앵커(#…)는 그대로 둔다", () => {
    expect(normalizeHref("/posts/1")).toBe("/posts/1");
    expect(normalizeHref("#section")).toBe("#section");
  });

  it("공백만 있거나 기본 안내값(https://)뿐이면 빈 문자열이다", () => {
    expect(normalizeHref("   ")).toBe("");
    expect(normalizeHref("https://")).toBe("");
  });

  it("앞뒤 공백은 지운다", () => {
    expect(normalizeHref("  a.com  ")).toBe("https://a.com");
  });
});
