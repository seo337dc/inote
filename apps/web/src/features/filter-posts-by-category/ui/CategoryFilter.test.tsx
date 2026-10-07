import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryFilter from "./CategoryFilter";

const CATEGORIES = [{ name: "학습", depth: 1 }];

describe("CategoryFilter — 검색어 유지", () => {
  it("검색 중이면 카테고리를 바꿔도 검색어(q)를 주소에 유지한다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategory={null}
        basePath="/my-posts"
        categories={CATEGORIES}
        counts={{ 학습: 1 }}
        totalCount={1}
        q="리액트"
      />,
    );

    expect(screen.getByRole("link", { name: "학습 (1)" })).toHaveAttribute(
      "href",
      `/my-posts?category=${encodeURIComponent("학습")}&q=${encodeURIComponent("리액트")}`,
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
        activeCategory={null}
        basePath="/my-posts"
        categories={CATEGORIES}
        counts={{ 학습: 1 }}
        totalCount={1}
      />,
    );

    expect(screen.getByRole("link", { name: "학습 (1)" })).toHaveAttribute(
      "href",
      `/my-posts?category=${encodeURIComponent("학습")}`,
    );
    expect(screen.getByRole("link", { name: "전체 (1)" })).toHaveAttribute("href", "/my-posts");
  });
});

describe("CategoryFilter — 관리 링크", () => {
  it("기본은 내 카테고리 관리 링크를 보여준다", () => {
    render(<CategoryFilter posts={[]} activeCategory={null} categories={CATEGORIES} counts={{ 학습: 1 }} totalCount={1} />);

    expect(screen.getByRole("link", { name: "관리" })).toHaveAttribute("href", "/categories");
  });

  it("showManage를 끄면(다른 사람의 카테고리) 관리 링크를 숨긴다", () => {
    render(
      <CategoryFilter
        posts={[]}
        activeCategory={null}
        categories={CATEGORIES}
        counts={{ 학습: 1 }}
        totalCount={1}
        showManage={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "관리" })).toBeNull();
  });
});
