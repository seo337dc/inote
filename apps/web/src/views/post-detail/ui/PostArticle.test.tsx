import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PostArticle from "./PostArticle";
import { makePost } from "@/test/fixtures/posts";

// 배지 표시만 보려는 테스트라 세션·쿼리가 필요한 주변 컴포넌트는 비워 둔다
vi.mock("@/widgets/post-outline", () => ({ PostOutline: () => null }));
vi.mock("./TogglePinButton", () => ({ default: () => null }));
vi.mock("./EditPostLink", () => ({ default: () => null }));
vi.mock("./DeletePostButton", () => ({ default: () => null }));
vi.mock("./PostSummarySection", () => ({ default: () => null }));

describe("PostArticle — 비공개 표시", () => {
  it("비공개 글이면 상단에 '비공개'를 보여준다", () => {
    render(<PostArticle post={makePost("p1", { isPrivate: true })} />);

    expect(screen.getByText("비공개")).toBeInTheDocument();
  });

  it("공개 글이면 '비공개'를 보여주지 않는다", () => {
    render(<PostArticle post={makePost("p1", { isPrivate: false })} />);

    expect(screen.queryByText("비공개")).not.toBeInTheDocument();
  });
});

describe("PostArticle — 생성일·수정일", () => {
  const PUBLISHED = "2026-10-01T05:30:00.000Z"; // 한국 14:30

  it("수정한 글은 '생성일 : … / 수정일 : …' 한 줄로 보여준다", () => {
    render(
      <PostArticle
        post={makePost("p1", { publishedAt: PUBLISHED, lastEditedAt: "2026-10-02T00:12:00.000Z" })}
      />,
    );

    expect(
      screen.getByText("생성일 : 2026.10.01 14:30 / 수정일 : 2026.10.02 09:12"),
    ).toBeInTheDocument();
  });

  it("수정한 적 없는 글은 생성일만 보여준다", () => {
    render(<PostArticle post={makePost("p1", { publishedAt: PUBLISHED, lastEditedAt: PUBLISHED })} />);

    expect(screen.getByText("생성일 : 2026.10.01 14:30")).toBeInTheDocument();
    expect(screen.queryByText(/수정일/)).not.toBeInTheDocument();
  });

  it("BE가 아직 lastEditedAt을 안 보내면 생성일만 보여준다", () => {
    render(<PostArticle post={makePost("p1", { publishedAt: PUBLISHED, lastEditedAt: null })} />);

    expect(screen.getByText("생성일 : 2026.10.01 14:30")).toBeInTheDocument();
    expect(screen.queryByText(/수정일/)).not.toBeInTheDocument();
  });
});
