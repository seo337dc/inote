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
const post = (id: string, category: string): MyPostOutlineItem => ({
  id,
  title: `글 ${id}`,
  category,
  isPrivate: false,
  publishedAt: "2026-09-01",
});

const CATEGORIES = [cat("c1", "학습", null, 0), cat("c2", "백엔드", "c1"), cat("c3", "일기", null, 1)];

describe("buildPostFolders", () => {
  it("글을 이름이 같은 폴더에 넣고, 하위까지 합친 글 수를 센다", () => {
    const roots = buildPostFolders(CATEGORIES, [post("a", "학습"), post("b", "백엔드"), post("c", "백엔드")]);

    expect(roots.map((f) => f.name)).toEqual(["학습", "일기"]);
    expect(roots[0].posts.map((p) => p.id)).toEqual(["a"]);
    expect(roots[0].folders[0].posts.map((p) => p.id)).toEqual(["b", "c"]);
    expect(roots[0].total).toBe(3);
    expect(roots[1].total).toBe(0);
  });

  it("카테고리 순서(position)를 따르고, 글은 받은 순서를 유지한다", () => {
    const roots = buildPostFolders(
      [cat("x", "나중", null, 1), cat("y", "먼저", null, 0)],
      [post("1", "먼저"), post("2", "먼저")],
    );

    expect(roots.map((f) => f.name)).toEqual(["먼저", "나중"]);
    expect(roots[0].posts.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("카테고리 트리에 없는 이름의 글은 맨 아래 '목록에 없는' 폴더로 모은다", () => {
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
    const roots = buildPostFolders(CATEGORIES, [post("b", "백엔드")]);

    // 학습(하위 있음), 백엔드(글 있음) — 일기는 비어 있어 펼칠 게 없음
    expect(expandableKeys(roots).sort()).toEqual(["c1", "c2"]);
  });
});

describe("findFolder / findPost", () => {
  const roots = buildPostFolders(CATEGORIES, [post("a", "학습"), post("b", "백엔드")]);

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
  const roots = buildPostFolders(CATEGORIES, [post("a", "학습"), post("x", "옛이름")]);

  it("다른 카테고리 폴더에 놓으면 옮길 내용(id, 옛 이름, 새 이름)을 돌려준다", () => {
    expect(resolvePostDrop(roots, "a", "c3")).toEqual({ id: "a", from: "학습", to: "일기" });
  });

  it("하위 폴더에도 놓을 수 있다", () => {
    expect(resolvePostDrop(roots, "a", "c2")).toEqual({ id: "a", from: "학습", to: "백엔드" });
  });

  it("이미 그 카테고리에 있는 글을 같은 폴더에 놓으면 아무것도 하지 않는다", () => {
    expect(resolvePostDrop(roots, "a", "c1")).toBeNull();
  });

  it("'목록에 없는 카테고리' 폴더에는 놓을 수 없다", () => {
    expect(resolvePostDrop(roots, "a", "name:옛이름")).toBeNull();
  });

  it("'목록에 없는 카테고리'에 있던 글은 정상 폴더로 옮길 수 있다", () => {
    expect(resolvePostDrop(roots, "x", "c1")).toEqual({ id: "x", from: "옛이름", to: "학습" });
  });

  it("없는 글이나 없는 폴더면 null", () => {
    expect(resolvePostDrop(roots, "없음", "c1")).toBeNull();
    expect(resolvePostDrop(roots, "a", "없음")).toBeNull();
  });
});
