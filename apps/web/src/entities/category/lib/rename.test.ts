import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import {
  checkCategoryName,
  checkNewCategoryName,
  renameCategoryInList,
  renamePostCategory,
} from "./rename";

const cat = (id: string, name: string, parentId: string | null = null): Category => ({
  id,
  userId: "u",
  name,
  parentId,
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

  it("같은 부모 아래 형제와 이름이 같으면 duplicate", () => {
    expect(checkCategoryName(LIST, "a", "이직")).toBe("duplicate");
  });

  it("다른 부모 아래에 같은 이름이 있어도 통과한다 (글은 id로 가리키므로)", () => {
    const list = [cat("a", "학습"), cat("b", "사이드"), cat("a-ai", "AI", "a"), cat("b-x", "이슈", "b")];

    expect(checkCategoryName(list, "b-x", "AI")).toBe("ok");
    expect(checkCategoryName(list, "a-ai", "이슈")).toBe("ok");
  });

  it("같은 부모 아래 형제와는 하위 카테고리도 겹치면 duplicate", () => {
    const list = [cat("a", "학습"), cat("a-ai", "AI", "a"), cat("a-be", "백엔드", "a")];

    expect(checkCategoryName(list, "a-be", "AI")).toBe("duplicate");
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

describe("renamePostCategory", () => {
  it("그 카테고리(id)에 속한 글의 이름 사본만 바꾼다 — 같은 이름의 다른 카테고리 글은 그대로", () => {
    const posts = [
      { id: "1", category: "AI", categoryId: "study-ai" },
      { id: "2", category: "AI", categoryId: "side-ai" },
      { id: "3", category: "AI", categoryId: null },
    ];

    expect(renamePostCategory(posts, "study-ai", "인공지능")).toEqual([
      { id: "1", category: "인공지능", categoryId: "study-ai" },
      { id: "2", category: "AI", categoryId: "side-ai" },
      { id: "3", category: "AI", categoryId: null },
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

  it("같은 부모 아래(최상위끼리 포함)에 같은 이름이 있으면 duplicate", () => {
    expect(checkNewCategoryName(list, "학습")).toBe("duplicate");
    expect(checkNewCategoryName(list, " 일기 ")).toBe("duplicate");
    const withChild = [...list, cat("3", "AI", "1")];
    expect(checkNewCategoryName(withChild, "AI", "1")).toBe("duplicate");
  });

  it("다른 부모 아래(또는 최상위)에 같은 이름이 있어도 ok — 그룹바이를 여러 부모에 둘 수 있다", () => {
    const withChild = [...list, cat("3", "그룹바이", "1")];

    expect(checkNewCategoryName(withChild, "그룹바이", "2")).toBe("ok");
    expect(checkNewCategoryName(withChild, "그룹바이")).toBe("ok"); // 최상위
    expect(checkNewCategoryName(withChild, "학습", "2")).toBe("ok"); // 최상위 이름이 하위에 다시 나와도 형제가 아니다
  });

  it("목록이 비어 있으면 어떤 이름이든 ok", () => {
    expect(checkNewCategoryName([], "학습")).toBe("ok");
  });
});
