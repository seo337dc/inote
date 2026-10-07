import { describe, expect, it } from "vitest";
import { changePostCategory, moveCountKey } from "./moveCategory";

describe("moveCountKey", () => {
  it("옛 카테고리를 하나 줄이고 새 카테고리를 하나 늘린다", () => {
    expect(moveCountKey({ 학습: 3, 일기: 1 }, "학습", "일기")).toEqual({ 학습: 2, 일기: 2 });
  });

  it("새 카테고리 키가 없으면 1로 만든다", () => {
    expect(moveCountKey({ 학습: 1 }, "학습", "이직")).toEqual({ 학습: 0, 이직: 1 });
  });

  it("줄일 카테고리 개수가 0이면 음수가 되지 않는다", () => {
    expect(moveCountKey({ 학습: 0 }, "학습", "일기").학습).toBe(0);
  });

  it("같은 카테고리로 옮기면 그대로 돌려준다", () => {
    const counts = { 학습: 3 };
    expect(moveCountKey(counts, "학습", "학습")).toBe(counts);
  });
});

describe("changePostCategory", () => {
  it("id가 같은 글 하나의 category만 바꾼다", () => {
    const posts = [
      { id: "1", category: "학습" },
      { id: "2", category: "학습" },
    ];

    expect(changePostCategory(posts, "2", "일기")).toEqual([
      { id: "1", category: "학습" },
      { id: "2", category: "일기" },
    ]);
  });

  it("옮긴 글의 옛 카테고리 경로(categoryPath)는 지우고, 다른 글의 경로는 그대로 둔다", () => {
    const posts = [
      { id: "1", category: "AI", categoryPath: ["학습", "AI"] },
      { id: "2", category: "AI", categoryPath: ["학습", "AI"] },
    ];

    const [other, moved] = changePostCategory(posts, "2", "일기");

    expect(other.categoryPath).toEqual(["학습", "AI"]);
    expect(moved.category).toBe("일기");
    expect(moved.categoryPath).toBeUndefined();
  });
});
