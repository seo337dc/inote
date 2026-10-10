import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import { buildCategoryTree, rollupCategoryCounts } from "./tree";

const cat = (id: string, parentId: string | null, position: number, createdAt = ""): Category => ({
  id,
  userId: "u",
  name: id,
  parentId,
  depth: parentId ? 2 : 1,
  position,
  createdAt,
  updatedAt: "",
});

describe("buildCategoryTree 정렬", () => {
  it("같은 부모 안에서 position 순서대로, 하위도 마찬가지로 정렬한다", () => {
    const tree = buildCategoryTree([
      cat("B", null, 1),
      cat("A", null, 0),
      cat("A2", "A", 1),
      cat("A1", "A", 0),
    ]);

    expect(tree.map((n) => n.id)).toEqual(["A", "B"]);
    expect(tree[0].children.map((n) => n.id)).toEqual(["A1", "A2"]);
  });

  it("position이 같으면 만든 순서를 따른다", () => {
    const tree = buildCategoryTree([
      cat("late", null, 0, "2026-02-01"),
      cat("early", null, 0, "2026-01-01"),
    ]);

    expect(tree.map((n) => n.id)).toEqual(["early", "late"]);
  });
});

describe("rollupCategoryCounts", () => {
  // 학습 > 백엔드 / AI,  이직
  const tree = buildCategoryTree([
    cat("학습", null, 0),
    cat("백엔드", "학습", 0),
    cat("AI", "학습", 1),
    cat("이직", null, 1),
  ]);

  it("상위 카테고리는 하위 카테고리 글까지 합친다", () => {
    const counts = rollupCategoryCounts(tree, { 학습: 1, 백엔드: 2, AI: 3, 이직: 4 });

    expect(counts).toEqual({ 학습: 6, 백엔드: 2, AI: 3, 이직: 4 });
  });

  it("직속 글이 없는 상위 카테고리도 하위 글만큼 센다 (0이 아니다)", () => {
    const counts = rollupCategoryCounts(tree, { 백엔드: 2, AI: 3 });

    expect(counts["학습"]).toBe(5);
  });

  it("개수 정보에 없는 카테고리는 0이다", () => {
    expect(rollupCategoryCounts(tree, {})).toEqual({ 학습: 0, 백엔드: 0, AI: 0, 이직: 0 });
  });

  it("3단계도 끝까지 합친다", () => {
    const deep = buildCategoryTree([cat("A", null, 0), cat("B", "A", 0), cat("C", "B", 0)]);

    expect(rollupCategoryCounts(deep, { A: 1, B: 1, C: 1 })).toEqual({ A: 3, B: 2, C: 1 });
  });
});
