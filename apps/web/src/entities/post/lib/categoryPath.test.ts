import { describe, expect, it } from "vitest";
import { getCategoryPath } from "./categoryPath";

describe("getCategoryPath", () => {
  it("경로가 있으면 그대로 돌려준다", () => {
    expect(getCategoryPath({ category: "AI", categoryPath: ["학습", "AI"] })).toEqual(["학습", "AI"]);
  });

  it("경로가 없으면(undefined) 카테고리 이름 하나로 대신한다", () => {
    expect(getCategoryPath({ category: "학습" })).toEqual(["학습"]);
  });

  it("경로가 빈 배열이어도 카테고리 이름 하나로 대신한다", () => {
    expect(getCategoryPath({ category: "학습", categoryPath: [] })).toEqual(["학습"]);
  });

  it("카테고리가 비어 있고 경로도 없으면 빈 배열이다", () => {
    expect(getCategoryPath({ category: "" })).toEqual([]);
  });
});
