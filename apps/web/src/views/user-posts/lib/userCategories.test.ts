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
  // 개수 맵의 키는 카테고리 id
  const direct = { c1: 2, c2: 1, c3: 3, c4: 4 };

  it("부모 바로 다음에 자식이 오는 순서로, 깊이와 함께 펼친다", () => {
    const { options } = buildUserCategoryFilter("u1", categories, direct);

    expect(options).toEqual([
      { id: "c1", name: "학습", depth: 1 },
      { id: "c2", name: "AI", depth: 2 },
      { id: "c3", name: "RAG", depth: 3 },
      { id: "c4", name: "일기", depth: 1 },
    ]);
  });

  it("카테고리별 개수는 하위까지 합친다 (눌렀을 때 나오는 글 수와 같게)", () => {
    const { counts } = buildUserCategoryFilter("u1", categories, direct);

    expect(counts).toEqual({ c1: 6, c2: 4, c3: 3, c4: 4 });
  });

  it("같은 이름이 두 곳에 있어도 id별로 따로 센다", () => {
    const tree = [
      cat("study", "학습", null, 1),
      cat("study-ai", "AI", "study", 2),
      cat("side", "사이드", null, 1),
      cat("side-ai", "AI", "side", 2),
    ];

    const { counts, options } = buildUserCategoryFilter("u1", tree, { "study-ai": 4, "side-ai": 1 });

    expect(counts).toEqual({ study: 4, "study-ai": 4, side: 1, "side-ai": 1 });
    expect(options.filter((o) => o.name === "AI").map((o) => o.id)).toEqual(["study-ai", "side-ai"]);
  });

  it("전체는 공개 글 전체 수다", () => {
    expect(buildUserCategoryFilter("u1", categories, direct).total).toBe(10);
  });

  it("직속 글이 없는 부모도 하위 글만큼 센다", () => {
    const { counts } = buildUserCategoryFilter("u1", categories, { c3: 2 });

    expect(counts).toMatchObject({ c1: 2, c2: 2, c3: 2 });
  });

  it("개수 맵에 없는 카테고리는 0으로 센다", () => {
    expect(buildUserCategoryFilter("u1", categories, {}).counts["c4"]).toBe(0);
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
    expect(buildUserCategoryFilter("u1", [], { unassigned: 2 })).toEqual({ options: [], counts: {}, total: 2 });
  });
});
