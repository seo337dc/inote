import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CategoryBreadcrumb from "./CategoryBreadcrumb";

describe("CategoryBreadcrumb", () => {
  it("경로를 '학습 > AI'처럼 위에서 아래 순서로 보여준다", () => {
    render(<CategoryBreadcrumb post={{ category: "AI", categoryPath: ["학습", "AI"] }} />);

    const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["학습", "AI"]);
  });

  it("각 이름은 그 카테고리의 글 목록으로 가는 링크다 (상위 카테고리도 따로 눌러 갈 수 있다)", () => {
    render(<CategoryBreadcrumb post={{ category: "AI", categoryPath: ["학습", "AI"] }} />);

    expect(screen.getByRole("link", { name: "학습" })).toHaveAttribute("href", `/?category=${encodeURIComponent("학습")}`);
    expect(screen.getByRole("link", { name: "AI" })).toHaveAttribute("href", "/?category=AI");
  });

  it("공백·특수문자가 있는 이름도 주소에 안전하게 담는다", () => {
    render(<CategoryBreadcrumb post={{ category: "C&C 기록", categoryPath: ["C&C 기록"] }} />);

    expect(screen.getByRole("link", { name: "C&C 기록" })).toHaveAttribute("href", "/?category=C%26C%20%EA%B8%B0%EB%A1%9D");
  });

  it("경로 단계가 3개여도 모두 순서대로 링크가 된다", () => {
    render(<CategoryBreadcrumb post={{ category: "RAG", categoryPath: ["학습", "AI", "RAG"] }} />);

    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습", "AI", "RAG"]);
  });

  it("최상위 카테고리면 이름 하나만 링크로 보여준다", () => {
    render(<CategoryBreadcrumb post={{ category: "일기", categoryPath: ["일기"] }} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "일기" })).toBeInTheDocument();
  });

  it("경로를 못 받으면(없음) 카테고리 이름 하나로 대신한다", () => {
    render(<CategoryBreadcrumb post={{ category: "학습" }} />);

    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
  });

  it("경로가 빈 배열이어도 카테고리 이름 하나로 대신한다", () => {
    render(<CategoryBreadcrumb post={{ category: "학습", categoryPath: [] }} />);

    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["학습"]);
  });

  it("카테고리가 비어 있고 경로도 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<CategoryBreadcrumb post={{ category: "" }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("같은 이름이 경로에 두 번 나와도(다른 부모 아래) 둘 다 그린다", () => {
    render(<CategoryBreadcrumb post={{ category: "AI", categoryPath: ["AI", "AI"] }} />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
