import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PostListHeader from "./PostListHeader";

// next/form은 앱 라우터 안에서만 동작해서, 테스트에서는 일반 <form>으로 바꿔 렌더링만 확인한다
vi.mock("next/form", () => ({
  default: ({ action, ...props }: React.ComponentProps<"form"> & { action: string }) => (
    <form action={action} {...props} />
  ),
}));

describe("PostListHeader — 검색", () => {
  it("검색은 basePath로 보내고, 지금 검색어를 입력칸에 채워 둔다", () => {
    render(<PostListHeader title="나의 글" count={3} basePath="/my-posts" category={null} q="리액트" />);

    expect(screen.getByRole("search")).toHaveAttribute("action", "/my-posts");
    expect(screen.getByRole("searchbox", { name: "글 검색" })).toHaveValue("리액트");
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
  });

  it("카테고리가 걸려 있으면 숨은 값으로 같이 보내서 그 카테고리 안에서 검색한다", () => {
    const { container } = render(
      <PostListHeader title="나의 글" count={3} basePath="/my-posts" category="학습" q={null} />,
    );

    expect(container.querySelector('input[type="hidden"][name="category"]')).toHaveValue("학습");
  });

  it("카테고리가 없으면 category 값을 보내지 않는다 (빈 category= 방지)", () => {
    const { container } = render(
      <PostListHeader title="전체 글" count={3} basePath="/" category={null} q={null} />,
    );

    expect(container.querySelector('input[name="category"]')).toBeNull();
  });

  it("글쓰기 버튼은 그대로 /write로 간다", () => {
    render(<PostListHeader title="전체 글" count={3} basePath="/" category={null} q={null} />);

    expect(screen.getByRole("link", { name: "글쓰기" })).toHaveAttribute("href", "/write");
  });

  it("showWrite를 끄면 글쓰기 버튼을 보여주지 않는다 (다른 사람의 글 목록)", () => {
    render(<PostListHeader title="서동찬의 글" count={3} basePath="/users/u1" category={null} q={null} showWrite={false} />);

    expect(screen.queryByRole("link", { name: "글쓰기" })).toBeNull();
    expect(screen.getByRole("heading", { name: "서동찬의 글" })).toBeInTheDocument();
  });
});
