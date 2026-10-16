import { describe, expect, it } from "vitest";
import { changePostCategory, moveCountKey } from "./moveCategory";

describe("moveCountKey (키 = 카테고리 id)", () => {
  it("옛 카테고리를 하나 줄이고 새 카테고리를 하나 늘린다", () => {
    expect(moveCountKey({ c1: 3, c2: 1 }, "c1", "c2")).toEqual({ c1: 2, c2: 2 });
  });

  it("새 카테고리 키가 없으면 1로 만든다", () => {
    expect(moveCountKey({ c1: 1 }, "c1", "c3")).toEqual({ c1: 0, c3: 1 });
  });

  it("줄일 카테고리 개수가 0이면 음수가 되지 않는다", () => {
    expect(moveCountKey({ c1: 0 }, "c1", "c2").c1).toBe(0);
  });

  it("같은 카테고리로 옮기면 그대로 돌려준다", () => {
    const counts = { c1: 3 };
    expect(moveCountKey(counts, "c1", "c1")).toBe(counts);
  });

  it("아직 지정 안 된 글(from이 null)을 옮기면 unassigned 칸이 줄어든다", () => {
    expect(moveCountKey({ unassigned: 4, c1: 1 }, null, "c1")).toEqual({ unassigned: 3, c1: 2 });
  });

  it("이름이 같은 다른 카테고리로 옮겨도 id가 다르면 따로 센다", () => {
    expect(moveCountKey({ "study-ai": 4, "side-ai": 1 }, "study-ai", "side-ai")).toEqual({ "study-ai": 3, "side-ai": 2 });
  });
});

describe("changePostCategory", () => {
  const to = { id: "c9", name: "일기" };

  it("id가 같은 글 하나의 카테고리(id와 이름 사본)만 바꾼다", () => {
    const posts = [
      { id: "1", category: "학습", categoryId: "c1" },
      { id: "2", category: "학습", categoryId: "c1" },
    ];

    expect(changePostCategory(posts, "2", to)).toEqual([
      { id: "1", category: "학습", categoryId: "c1" },
      { id: "2", category: "일기", categoryId: "c9" },
    ]);
  });

  it("아직 지정 안 된 글(categoryId null)도 옮기면 id가 생긴다", () => {
    const [moved] = changePostCategory([{ id: "1", category: "AI", categoryId: null }], "1", to);

    expect(moved.categoryId).toBe("c9");
  });

  it("옮긴 글의 옛 카테고리 경로(categoryPath)는 지우고, 다른 글의 경로는 그대로 둔다", () => {
    const path = [
      { id: "c1", name: "학습" },
      { id: "c2", name: "AI" },
    ];
    const posts = [
      { id: "1", category: "AI", categoryId: "c2", categoryPath: path },
      { id: "2", category: "AI", categoryId: "c2", categoryPath: path },
    ];

    const [other, moved] = changePostCategory(posts, "2", to);

    expect(other.categoryPath).toEqual(path);
    expect(moved.category).toBe("일기");
    expect(moved.categoryPath).toBeUndefined();
  });
});
