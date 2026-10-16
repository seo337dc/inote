import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryFilter from "./CategoryFilter";

const CATEGORIES = [{ id: "c1", name: "학습", depth: 1 }];

describe("CategoryFilter — 검색어 유지", () => {
  it("검색 중이면 카테고리를 바꿔도 검색어(q)를 주소에 유지한다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategoryId={null}
        basePath="/my-posts"
        categories={CATEGORIES}
        counts={{ c1: 1 }}
        totalCount={1}
        q="리액트"
      />,
    );

    expect(screen.getByRole("link", { name: "학습 (1)" })).toHaveAttribute(
      "href",
      `/my-posts?categoryId=c1&q=${encodeURIComponent("리액트")}`,
    );
    expect(screen.getByRole("link", { name: "전체 (1)" })).toHaveAttribute(
      "href",
      `/my-posts?q=${encodeURIComponent("리액트")}`,
    );
  });

  it("검색어가 없으면 지금처럼 카테고리만 주소에 담는다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategoryId={null}
        basePath="/my-posts"
        categories={CATEGORIES}
        counts={{ c1: 1 }}
        totalCount={1}
      />,
    );

    expect(screen.getByRole("link", { name: "학습 (1)" })).toHaveAttribute(
      "href",
      "/my-posts?categoryId=c1",
    );
    expect(screen.getByRole("link", { name: "전체 (1)" })).toHaveAttribute("href", "/my-posts");
  });
});

describe("CategoryFilter — 관리 링크", () => {
  it("기본은 내 카테고리 관리 링크를 보여준다", () => {
    render(<CategoryFilter posts={[]} activeCategoryId={null} categories={CATEGORIES} counts={{ c1: 1 }} totalCount={1} />);

    expect(screen.getByRole("link", { name: "관리" })).toHaveAttribute("href", "/categories");
  });

  it("showManage를 끄면(다른 사람의 카테고리) 관리 링크를 숨긴다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategoryId={null}
        categories={CATEGORIES}
        counts={{ c1: 1 }}
        totalCount={1}
        showManage={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "관리" })).toBeNull();
  });
});

describe("CategoryFilter — 같은 이름이 여러 곳에 있을 때", () => {
  // 학습 > AI, 사이드프로젝트 > AI — 이름은 같지만 서로 다른 카테고리다
  const TREE = [
    { id: "study", name: "학습", depth: 1 },
    { id: "study-ai", name: "AI", depth: 2 },
    { id: "side", name: "사이드프로젝트", depth: 1 },
    { id: "side-ai", name: "AI", depth: 2 },
  ];

  it("선택 강조는 고른 카테고리 하나에만 걸린다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategoryId="side-ai"
        categories={TREE}
        counts={{ study: 4, "study-ai": 4, side: 2, "side-ai": 2 }}
        totalCount={6}
      />,
    );

    const [studyAi, sideAi] = screen.getAllByRole("link", { name: /AI/ });
    expect(sideAi.className).toContain("bg-zinc-900");
    expect(studyAi.className).not.toContain("bg-zinc-900");
  });

  it("글 수는 id별로 따로 센다 (두 AI가 같은 숫자로 합쳐지지 않는다)", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategoryId={null}
        categories={TREE}
        counts={{ study: 4, "study-ai": 4, side: 1, "side-ai": 1 }}
        totalCount={5}
      />,
    );

    const [studyAi, sideAi] = screen.getAllByRole("link", { name: /AI/ });
    expect(studyAi).toHaveTextContent("AI (4)");
    expect(sideAi).toHaveTextContent("AI (1)");
  });

  it("링크는 이름이 아니라 id를 담는다", () => {
    render(<CategoryFilter posts={[]} activeCategoryId={null} categories={TREE} counts={{}} totalCount={0} />);

    const [studyAi, sideAi] = screen.getAllByRole("link", { name: /AI/ });
    expect(studyAi).toHaveAttribute("href", "/?categoryId=study-ai");
    expect(sideAi).toHaveAttribute("href", "/?categoryId=side-ai");
  });
});
