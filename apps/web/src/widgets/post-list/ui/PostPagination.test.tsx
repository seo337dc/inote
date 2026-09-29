import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PostPagination from "./PostPagination";

const base = { basePath: "/", pageParam: "page", label: "전체 글 페이지 이동" };

describe("PostPagination", () => {
  it("페이지가 1개뿐이어도 '1 / 1'을 보여주고 이전·다음은 눌리지 않는다", () => {
    render(<PostPagination {...base} page={1} totalPages={1} keep={{}} />);

    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "이전" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "다음" })).not.toBeInTheDocument();
  });

  it("중간 페이지에서는 이전·다음 링크가 각각 앞뒤 페이지로 간다", () => {
    render(<PostPagination {...base} page={2} totalPages={3} keep={{}} />);

    expect(screen.getByRole("link", { name: "이전" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "다음" })).toHaveAttribute("href", "/?page=3");
  });

  it("다른 영역의 페이지와 카테고리는 주소에 유지하고, 1페이지 값은 주소에서 뺀다", () => {
    render(
      <PostPagination
        {...base}
        page={1}
        totalPages={4}
        keep={{ category: "학습", pinnedPage: 2 }}
      />,
    );

    expect(screen.getByRole("link", { name: "다음" })).toHaveAttribute(
      "href",
      "/?category=%ED%95%99%EC%8A%B5&pinnedPage=2&page=2",
    );
  });

  it("자기 파라미터 이름(pageParam)으로 페이지를 표시한다", () => {
    render(
      <PostPagination
        basePath="/my-posts"
        pageParam="pinnedPage"
        label="고정 글 페이지 이동"
        page={1}
        totalPages={2}
        keep={{ page: 3 }}
      />,
    );

    expect(screen.getByRole("link", { name: "다음" })).toHaveAttribute(
      "href",
      "/my-posts?page=3&pinnedPage=2",
    );
  });

  it("영역을 구분할 수 있게 label을 nav 이름으로 쓴다", () => {
    render(<PostPagination {...base} label="고정 글 페이지 이동" page={1} totalPages={1} keep={{}} />);

    expect(screen.getByRole("navigation", { name: "고정 글 페이지 이동" })).toBeInTheDocument();
  });
});
