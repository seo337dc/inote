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

const post = (id: string, category: string): PostOutlineItem => ({
  id,
  title: `글 ${id}`,
  category,
  isPrivate: false,
  pinned: false,
});

const CATEGORIES = [cat("c1", "학습", null, 1), cat("c2", "React", "c1", 2), cat("c3", "일기", null, 1)];

describe("buildOutline", () => {
  it("글을 이름이 같은 카테고리 폴더에 넣고, 하위 폴더 글까지 합쳐 total을 센다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습"), post("b", "React"), post("c", "React")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기"]);
    const study = roots[0];
    expect(study.posts.map((p) => p.id)).toEqual(["a"]);
    expect(study.folders[0].name).toBe("React");
    expect(study.folders[0].posts.map((p) => p.id)).toEqual(["b", "c"]);
    expect(study.total).toBe(3);
    expect(roots[1].total).toBe(0);
  });

  it("트리에 없는 카테고리의 글은 맨 아래에 이름만 있는 폴더로 붙인다", () => {
    const roots = buildOutline(CATEGORIES, [post("x", "여행"), post("y", "여행")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기", "여행"]);
    expect(roots[2].posts.map((p) => p.id)).toEqual(["x", "y"]);
    expect(roots[2].total).toBe(2);
  });
});

describe("findActiveFolderKeys", () => {
  it("글이 들어 있는 폴더와 그 상위 폴더 key를 돌려준다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습"), post("b", "React")]);

    expect([...findActiveFolderKeys(roots, "b")].sort()).toEqual(["c1", "c2"]);
    expect([...findActiveFolderKeys(roots, "a")]).toEqual(["c1"]);
  });

  it("목록에 없는 글이면 빈 집합이다", () => {
    const roots = buildOutline(CATEGORIES, [post("a", "학습")]);

    expect(findActiveFolderKeys(roots, "없음").size).toBe(0);
  });
});
