import { describe, expect, it } from "vitest";
import { getCategoryPath } from "./categoryPath";

const study = { id: "c1", name: "학습" };
const ai = { id: "c2", name: "AI" };

describe("getCategoryPath", () => {
  it("경로가 있으면 그대로 돌려준다", () => {
    expect(getCategoryPath({ category: "AI", categoryId: "c2", categoryPath: [study, ai] })).toEqual([study, ai]);
  });

  it("경로가 없으면(undefined) 이 글의 카테고리 하나로 대신한다 (id 포함)", () => {
    expect(getCategoryPath({ category: "학습", categoryId: "c1" })).toEqual([study]);
  });

  it("경로가 빈 배열이어도 카테고리 하나로 대신한다", () => {
    expect(getCategoryPath({ category: "학습", categoryId: "c1", categoryPath: [] })).toEqual([study]);
  });

  it("아직 카테고리가 지정되지 않은 글은 id가 null인 이름 하나로 대신한다", () => {
    expect(getCategoryPath({ category: "AI", categoryId: null })).toEqual([{ id: null, name: "AI" }]);
  });

  it("카테고리가 비어 있고 경로도 없으면 빈 배열이다", () => {
    expect(getCategoryPath({ category: "", categoryId: null })).toEqual([]);
  });
});
