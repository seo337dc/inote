import { describe, expect, it } from "vitest";
import { toCategories } from "./publicCategories";

describe("toCategories", () => {
  it("트리 조립에 필요한 칸(userId, position, updatedAt)을 채워 Category로 바꾼다", () => {
    const [c] = toCategories("u1", [{ id: "c1", name: "학습", parentId: null, depth: 1, createdAt: "2026-01-01" }]);

    expect(c).toEqual({
      id: "c1",
      name: "학습",
      parentId: null,
      depth: 1,
      createdAt: "2026-01-01",
      userId: "u1",
      position: 0,
      updatedAt: "2026-01-01",
    });
  });

  it("빈 목록이면 빈 목록이다", () => {
    expect(toCategories("u1", [])).toEqual([]);
  });
});
