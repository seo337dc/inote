import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PostList from "./PostList";
import { makePost } from "@/test/fixtures/posts";

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
