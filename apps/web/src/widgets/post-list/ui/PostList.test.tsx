import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PostList from "./PostList";
import { makePost } from "@/test/fixtures/posts";

describe("PostList — 제목·작성자 링크", () => {
  it("카드 전체가 아니라 제목만 글 상세로 가는 링크다", () => {
    render(<PostList posts={[makePost("p1", { title: "리액트 쿼리", excerpt: "요약 문장" })]} />);

    const row = screen.getByRole("listitem");
    expect(within(row).getByRole("link", { name: "리액트 쿼리" })).toHaveAttribute("href", "/posts/p1");
    // 배지·요약·날짜는 링크가 아니라서, 링크는 제목과 작성자 둘뿐이다 (링크 안에 링크가 겹치지 않는다)
    expect(within(row).getAllByRole("link")).toHaveLength(2);
    expect(within(row).getByText("요약 문장").closest("a")).toBeNull();
  });

  it("작성자를 누르면 그 사람의 글 목록(/users/[id])으로 가는 별도 링크다", () => {
    render(<PostList posts={[makePost("p1", { userId: "u7", user: { name: "서동찬", email: "a@a.com" } })]} />);

    const author = screen.getByRole("link", { name: "서동찬 (a@a.com)" });
    expect(author).toHaveAttribute("href", "/users/u7");
  });

  it("글마다 자기 작성자의 목록으로 연결된다", () => {
    render(
      <PostList
        posts={[
          makePost("a", { userId: "u1", user: { name: "가", email: "g@a.com" } }),
          makePost("b", { userId: "u2", user: { name: "나", email: "n@a.com" } }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "가 (g@a.com)" })).toHaveAttribute("href", "/users/u1");
    expect(screen.getByRole("link", { name: "나 (n@a.com)" })).toHaveAttribute("href", "/users/u2");
  });

  it("작성자 정보가 없는 글(탈퇴 등)은 '작성자 없음'을 링크 없이 보여준다", () => {
    render(<PostList posts={[makePost("p1", { userId: null, user: null })]} />);

    const row = screen.getByRole("listitem");
    expect(within(row).getByText("작성자 없음")).toBeInTheDocument();
    expect(within(row).getAllByRole("link")).toHaveLength(1); // 제목만
  });

  it("작성자 id가 없으면(user만 있음) 이름은 보여주되 링크는 걸지 않는다", () => {
    render(<PostList posts={[makePost("p1", { userId: null, user: { name: "서동찬", email: "a@a.com" } })]} />);

    expect(screen.getByText("서동찬 (a@a.com)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /서동찬/ })).toBeNull();
  });
});

describe("PostList — 카테고리 경로", () => {
  it("카드 배지에 카테고리 경로('학습 > AI')를 보여준다", () => {
    render(<PostList posts={[makePost("a", { category: "AI", categoryPath: ["학습", "AI"] })]} />);

    expect(screen.getByText("학습 > AI")).toBeInTheDocument();
  });

  it("경로가 없으면(BE가 아직 안 보냄) 카테고리 이름 하나만 보여준다", () => {
    render(<PostList posts={[makePost("a", { category: "학습" })]} />);

    expect(screen.getByText("학습")).toBeInTheDocument();
  });
});

describe("PostList — 비공개 표시", () => {
  it("비공개 글 행에만 '비공개'를 보여준다", () => {
    render(
      <PostList
        posts={[
          makePost("a", { title: "비공개 글", isPrivate: true }),
          makePost("b", { title: "공개 글", isPrivate: false }),
        ]}
      />,
    );

    const [privateRow, publicRow] = screen.getAllByRole("listitem");
    expect(within(privateRow).getByText("비공개")).toBeInTheDocument();
    expect(within(publicRow).queryByText("비공개")).not.toBeInTheDocument();
  });
});

describe("PostList — 작성·수정 시각", () => {
  it("수정한 글은 작성·수정 시각을 둘 다, 수정 안 한 글은 작성 시각만 한국 시간으로 보여준다", () => {
    render(
      <PostList
        posts={[
          makePost("a", {
            publishedAt: "2026-10-01T05:30:00.000Z",
            lastEditedAt: "2026-10-02T00:12:00.000Z",
          }),
          makePost("b", {
            publishedAt: "2026-10-01T05:30:00.000Z",
            lastEditedAt: "2026-10-01T05:30:00.000Z",
          }),
        ]}
      />,
    );

    const [editedRow, plainRow] = screen.getAllByRole("listitem");
    expect(within(editedRow).getByText("생성일 : 2026.10.01 14:30 / 수정일 : 2026.10.02 09:12")).toBeInTheDocument();
    expect(within(plainRow).getByText("생성일 : 2026.10.01 14:30")).toBeInTheDocument();
  });
});
