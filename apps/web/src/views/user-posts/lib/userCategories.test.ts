import { describe, expect, it } from "vitest";
import { buildUserCategoryFilter } from "./userCategories";

const cat = (id: string, name: string, parentId: string | null, depth: number, createdAt = "2026-01-01") => ({
  id,
  name,
  parentId,
  depth,
  createdAt,
});

describe("buildUserCategoryFilter", () => {
  const categories = [
    cat("c1", "학습", null, 1, "2026-01-01"),
    cat("c2", "AI", "c1", 2, "2026-01-02"),
    cat("c3", "RAG", "c2", 3, "2026-01-03"),
    cat("c4", "일기", null, 1, "2026-01-04"),
  ];
  const direct = { 학습: 2, AI: 1, RAG: 3, 일기: 4 };

  it("부모 바로 다음에 자식이 오는 순서로, 깊이와 함께 펼친다", () => {
    const { options } = buildUserCategoryFilter("u1", categories, direct);

    expect(options).toEqual([
      { name: "학습", depth: 1 },
      { name: "AI", depth: 2 },
      { name: "RAG", depth: 3 },
      { name: "일기", depth: 1 },
    ]);
  });

  it("카테고리별 개수는 하위까지 합친다 (눌렀을 때 나오는 글 수와 같게)", () => {
    const { counts } = buildUserCategoryFilter("u1", categories, direct);

    expect(counts).toEqual({ 학습: 6, AI: 4, RAG: 3, 일기: 4 });
  });

  it("전체는 공개 글 전체 수다", () => {
    expect(buildUserCategoryFilter("u1", categories, direct).total).toBe(10);
  });

  it("직속 글이 없는 부모도 하위 글만큼 센다", () => {
    const { counts } = buildUserCategoryFilter("u1", categories, { RAG: 2 });

    expect(counts).toMatchObject({ 학습: 2, AI: 2, RAG: 2 });
  });

  it("개수 맵에 없는 카테고리는 0으로 센다", () => {
    expect(buildUserCategoryFilter("u1", categories, {}).counts["일기"]).toBe(0);
  });

  it("같은 부모 안에서는 먼저 만든 순서다", () => {
    const { options } = buildUserCategoryFilter(
      "u1",
      [cat("a", "나중", null, 1, "2026-02-01"), cat("b", "먼저", null, 1, "2026-01-01")],
      {},
    );

    expect(options.map((o) => o.name)).toEqual(["먼저", "나중"]);
  });

  it("카테고리가 하나도 없으면 빈 목록이고 전체만 센다", () => {
    expect(buildUserCategoryFilter("u1", [], { 옛카테고리: 2 })).toEqual({ options: [], counts: {}, total: 2 });
  });
});
