import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import {
  checkCategoryName,
  checkNewCategoryName,
  renameCategoryInList,
  renameCountKey,
  renamePostCategory,
} from "./rename";

const cat = (id: string, name: string): Category => ({
  id,
  userId: "u",
  name,
  parentId: null,
  depth: 1,
  position: 0,
  createdAt: "",
  updatedAt: "",
});
const LIST = [cat("a", "학습"), cat("b", "이직")];

describe("checkCategoryName", () => {
  it("새롭고 겹치지 않는 이름은 통과한다 (앞뒤 공백은 무시)", () => {
    expect(checkCategoryName(LIST, "a", "  공부  ")).toBe("ok");
  });

  it("비어 있거나 공백뿐이면 empty", () => {
    expect(checkCategoryName(LIST, "a", "   ")).toBe("empty");
  });

  it("50자를 넘으면 too-long, 50자는 통과", () => {
    expect(checkCategoryName(LIST, "a", "가".repeat(51))).toBe("too-long");
    expect(checkCategoryName(LIST, "a", "가".repeat(50))).toBe("ok");
  });

  it("다른 카테고리와 이름이 같으면 duplicate", () => {
    expect(checkCategoryName(LIST, "a", "이직")).toBe("duplicate");
  });

  it("자기 자신의 지금 이름과 같으면 duplicate가 아니라 unchanged", () => {
    expect(checkCategoryName(LIST, "a", "학습")).toBe("unchanged");
    expect(checkCategoryName(LIST, "a", " 학습 ")).toBe("unchanged");
  });
});

describe("renameCategoryInList", () => {
  it("해당 id의 이름만 바꾸고 나머지는 그대로 둔다", () => {
    const next = renameCategoryInList(LIST, "a", "공부");

    expect(next.map((c) => c.name)).toEqual(["공부", "이직"]);
    expect(LIST[0].name).toBe("학습"); // 원본은 그대로
  });
});

describe("renameCountKey", () => {
  it("옛 이름 키를 새 이름으로 옮긴다", () => {
    expect(renameCountKey({ 학습: 3, 이직: 1 }, "학습", "공부")).toEqual({ 공부: 3, 이직: 1 });
  });

  it("새 이름 키가 이미 있으면 합산한다", () => {
    expect(renameCountKey({ 학습: 3, 공부: 2 }, "학습", "공부")).toEqual({ 공부: 5 });
  });

  it("옛 이름 키가 없으면 그대로 돌려준다", () => {
    const counts = { 이직: 1 };
    expect(renameCountKey(counts, "학습", "공부")).toBe(counts);
  });
});

describe("renamePostCategory", () => {
  it("옛 카테고리 이름의 글만 새 이름으로 바꾼다", () => {
    const posts = [
      { id: "1", category: "학습" },
      { id: "2", category: "이직" },
    ];

    expect(renamePostCategory(posts, "학습", "공부")).toEqual([
      { id: "1", category: "공부" },
      { id: "2", category: "이직" },
    ]);
  });
});

describe("checkNewCategoryName", () => {
  const list = [cat("1", "학습"), cat("2", "일기")];

  it("겹치지 않는 이름은 ok다 (앞뒤 공백은 무시)", () => {
    expect(checkNewCategoryName(list, "  이직 ")).toBe("ok");
  });

  it("빈 이름·공백만이면 empty", () => {
    expect(checkNewCategoryName(list, "   ")).toBe("empty");
  });

  it("50자를 넘으면 too-long (50자는 ok)", () => {
    expect(checkNewCategoryName(list, "가".repeat(51))).toBe("too-long");
    expect(checkNewCategoryName(list, "가".repeat(50))).toBe("ok");
  });

  it("내 카테고리 중 같은 이름이 있으면 duplicate (다른 단계에 있어도 겹침)", () => {
    expect(checkNewCategoryName(list, "학습")).toBe("duplicate");
    expect(checkNewCategoryName(list, " 일기 ")).toBe("duplicate");
  });

  it("목록이 비어 있으면 어떤 이름이든 ok", () => {
    expect(checkNewCategoryName([], "학습")).toBe("ok");
  });
});
