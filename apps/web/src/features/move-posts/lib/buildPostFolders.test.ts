import { describe, expect, it } from "vitest";
import type { Category } from "@/entities/category";
import type { MyPostOutlineItem } from "@/entities/post";
import { buildPostFolders, expandableKeys, findFolder, findPost, resolvePostDrop } from "./buildPostFolders";

const cat = (id: string, name: string, parentId: string | null, position = 0): Category => ({
  id,
  userId: "u",
  name,
  parentId,
  depth: parentId ? 2 : 1,
  position,
  createdAt: "",
  updatedAt: "",
});
// 글은 카테고리 id로 가리킨다 — name은 표시용 이름 사본이라 두 번째 인자(id)와 따로 준다. id가 null이면 아직 지정 안 된 글
const post = (id: string, category: string, categoryId: string | null = null): MyPostOutlineItem => ({
  id,
  title: `글 ${id}`,
  category,
  categoryId,
  isPrivate: false,
  publishedAt: "2026-09-01",
});

const CATEGORIES = [cat("c1", "학습", null, 0), cat("c2", "백엔드", "c1"), cat("c3", "일기", null, 1)];

describe("buildPostFolders", () => {
  it("글을 id가 같은 폴더에 넣고, 하위까지 합친 글 수를 센다", () => {
    const roots = buildPostFolders(CATEGORIES, [post("a", "학습", "c1"), post("b", "백엔드", "c2"), post("c", "백엔드", "c2")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기"]);
    expect(roots[0].posts.map((p) => p.id)).toEqual(["a"]);
    expect(roots[0].folders[0].posts.map((p) => p.id)).toEqual(["b", "c"]);
    expect(roots[0].total).toBe(3);
    expect(roots[1].total).toBe(0);
  });

  it("카테고리 순서(position)를 따르고, 글은 받은 순서를 유지한다", () => {
    const roots = buildPostFolders(
      [cat("x", "나중", null, 1), cat("y", "먼저", null, 0)],
      [post("1", "먼저", "y"), post("2", "먼저", "y")],
    );

    expect(roots.map((f) => f.name)).toEqual(["먼저", "나중"]);
    expect(roots[0].posts.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("같은 이름이 다른 부모 아래에 있어도 글이 섞이지 않는다 (id로 찾는다)", () => {
    const tree = [cat("study", "학습", null, 0), cat("study-ai", "AI", "study"), cat("side", "사이드", null, 1), cat("side-ai", "AI", "side")];

    const roots = buildPostFolders(tree, [post("1", "AI", "study-ai"), post("2", "AI", "side-ai"), post("3", "AI", "side-ai")]);

    expect(roots[0].folders[0].posts.map((p) => p.id)).toEqual(["1"]);
    expect(roots[1].folders[0].posts.map((p) => p.id)).toEqual(["2", "3"]);
    expect(roots.filter((f) => f.isOrphan)).toHaveLength(0);
  });

  it("카테고리가 아직 지정되지 않은 글(id 없음)은 맨 아래 '연결 안 된' 폴더에 이름별로 모은다", () => {
    const roots = buildPostFolders(CATEGORIES, [post("x", "옛이름"), post("y", "옛이름")]);

    const orphan = roots[roots.length - 1];
    expect(orphan.name).toBe("옛이름");
    expect(orphan.isOrphan).toBe(true);
    expect(orphan.key).toBe("name:옛이름");
    expect(orphan.posts).toHaveLength(2);
    expect(roots.filter((f) => f.isOrphan)).toHaveLength(1);
  });
});

describe("expandableKeys", () => {
  it("하위 폴더나 글이 있는 폴더의 key만 돌려준다", () => {
    const roots = buildPostFolders(CATEGORIES, [post("b", "백엔드", "c2")]);

    // 학습(하위 있음), 백엔드(글 있음) — 일기는 비어 있어 펼칠 게 없음
    expect(expandableKeys(roots).sort()).toEqual(["c1", "c2"]);
  });
});

describe("findFolder / findPost", () => {
  const roots = buildPostFolders(CATEGORIES, [post("a", "학습", "c1"), post("b", "백엔드", "c2")]);

  it("하위 폴더까지 뒤져서 key로 폴더를 찾는다", () => {
    expect(findFolder(roots, "c2")?.name).toBe("백엔드");
    expect(findFolder(roots, "없음")).toBeNull();
  });

  it("글 id로 글과 그 글이 들어 있는 폴더를 찾는다", () => {
    const found = findPost(roots, "b");
    expect(found?.post.id).toBe("b");
    expect(found?.folder.name).toBe("백엔드");
    expect(findPost(roots, "없음")).toBeNull();
  });
});

describe("resolvePostDrop", () => {
  const roots = buildPostFolders(CATEGORIES, [post("a", "학습", "c1"), post("x", "옛이름")]);

  it("다른 카테고리 폴더에 놓으면 옮길 내용(글 id, 옛 카테고리 id, 새 카테고리 id·이름)을 돌려준다", () => {
    expect(resolvePostDrop(roots, "a", "c3")).toEqual({ id: "a", from: "c1", to: { id: "c3", name: "일기" } });
  });

  it("하위 폴더에도 놓을 수 있다", () => {
    expect(resolvePostDrop(roots, "a", "c2")).toEqual({ id: "a", from: "c1", to: { id: "c2", name: "백엔드" } });
  });

  it("이미 그 카테고리에 있는 글을 같은 폴더에 놓으면 아무것도 하지 않는다", () => {
    expect(resolvePostDrop(roots, "a", "c1")).toBeNull();
  });

  it("'연결 안 된' 폴더에는 놓을 수 없다", () => {
    expect(resolvePostDrop(roots, "a", "name:옛이름")).toBeNull();
  });

  it("카테고리가 아직 지정 안 된 글(from이 null)은 진짜 폴더로 끌어다 놓아 지정할 수 있다", () => {
    expect(resolvePostDrop(roots, "x", "c1")).toEqual({ id: "x", from: null, to: { id: "c1", name: "학습" } });
  });

  it("없는 글이나 없는 폴더면 null", () => {
    expect(resolvePostDrop(roots, "없음", "c1")).toBeNull();
    expect(resolvePostDrop(roots, "a", "없음")).toBeNull();
  });
});
