import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import { buildCategoryTree } from "./tree";

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
