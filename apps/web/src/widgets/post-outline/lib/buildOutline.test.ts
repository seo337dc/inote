import { describe, expect, it } from "vitest";
import type { Category } from "@/entities/category";
import type { PostOutlineItem } from "@/entities/post";
import { buildOutline, findActiveFolderKeys } from "./buildOutline";

const cat = (id: string, name: string, parentId: string | null, depth: number): Category => ({
  id,
  userId: "u",
  name,
  parentId,
  depth,
  position: 0,
  createdAt: "",
  updatedAt: "",
});

// 글은 카테고리 id로 가리킨다 — category는 표시용 이름 사본. id가 null이면 아직 지정 안 된 글
const post = (id: string, category: string, categoryId: string | null = null): PostOutlineItem => ({
  id,
  title: `글 ${id}`,
  category,
  categoryId,
  isPrivate: false,
  pinned: false,
});

const CATEGORIES = [cat("c1", "학습", null, 1), cat("c2", "React", "c1", 2), cat("c3", "일기", null, 1)];

describe("buildOutline", () => {
  it("글을 id가 같은 카테고리 폴더에 넣고, 하위 폴더 글까지 합쳐 total을 센다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습", "c1"), post("b", "React", "c2"), post("c", "React", "c2")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기"]);
    const study = roots[0];
    expect(study.posts.map((p) => p.id)).toEqual(["a"]);
    expect(study.folders[0].name).toBe("React");
    expect(study.folders[0].posts.map((p) => p.id)).toEqual(["b", "c"]);
    expect(study.total).toBe(3);
    expect(roots[1].total).toBe(0);
  });

  it("같은 이름이 다른 부모 아래에 있어도 글이 섞이지 않는다", () => {
    const tree = [
      cat("study", "학습", null, 1),
      cat("study-ai", "AI", "study", 2),
      cat("side", "사이드", null, 1),
      cat("side-ai", "AI", "side", 2),
    ];

    const roots = buildOutline(tree, [post("1", "AI", "study-ai"), post("2", "AI", "side-ai")]);

    expect(roots[0].folders[0].posts.map((p) => p.id)).toEqual(["1"]);
    expect(roots[1].folders[0].posts.map((p) => p.id)).toEqual(["2"]);
    expect(roots).toHaveLength(2); // 이름만 있는 별도 폴더가 생기지 않는다
  });

  it("카테고리 id가 없거나 트리에 없는 글은 맨 아래에 이름만 있는 폴더로 붙인다", () => {
    const roots = buildOutline(CATEGORIES, [post("x", "여행"), post("y", "여행")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기", "여행"]);
    expect(roots[2].posts.map((p) => p.id)).toEqual(["x", "y"]);
    expect(roots[2].total).toBe(2);
  });
});

describe("findActiveFolderKeys", () => {
  it("글이 들어 있는 폴더와 그 상위 폴더 key를 돌려준다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습", "c1"), post("b", "React", "c2")]);

    expect([...findActiveFolderKeys(roots, "b")].sort()).toEqual(["c1", "c2"]);
    expect([...findActiveFolderKeys(roots, "a")]).toEqual(["c1"]);
  });

  it("목록에 없는 글이면 빈 집합이다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습", "c1")]);

    expect(findActiveFolderKeys(roots, "없음").size).toBe(0);
  });
});
