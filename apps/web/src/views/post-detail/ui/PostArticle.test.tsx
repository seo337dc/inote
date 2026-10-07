import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostArticle from "./PostArticle";
import { OUTLINE_HEADER_CLASS, TOC_HEADER_CLASS } from "./PostArticleLayout";
import { makePost } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";

// 배지 표시만 보려는 테스트라 세션·쿼리가 필요한 주변 컴포넌트는 비워 둔다
// 카테고리 영역 헤더 줄에 비워 둔 간격(headerClassName)이 전달되는지 볼 수 있게 받은 값을 표시만 한다
vi.mock("@/widgets/post-outline", () => ({
  PostOutline: ({
    headerClassName,
    collapsed,
    authorId,
  }: {
    headerClassName?: string;
    collapsed?: boolean;
    authorId?: string | null;
  }) => (
    <div
      data-testid="outline"
      data-header-class={headerClassName ?? ""}
      data-collapsed={String(Boolean(collapsed))}
      data-author-id={authorId ?? ""}
    />
  ),
}));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
vi.mock("./TogglePinButton", () => ({ default: () => null }));
vi.mock("./EditPostLink", () => ({ default: () => null }));
vi.mock("./DeletePostButton", () => ({ default: () => null }));
vi.mock("./PostSummarySection", () => ({ default: () => null }));

describe("PostArticle — 작성자", () => {
  function loginAs(userId: string | null) {
    vi.mocked(useSession).mockReturnValue({
      data: userId ? { user: { id: userId } } : null,
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  }

  it("작성자 이름을 누르면 그 사람의 홈(/users/[id])으로 이동한다", () => {
    loginAs("other");
    render(<PostArticle post={makePost("p1", { userId: "u1", user: { name: "서동찬", email: "a@a.com" } })} />);

    expect(screen.getByRole("link", { name: "서동찬 (a@a.com)" })).toHaveAttribute("href", "/users/u1");
  });

  it("내 글이면 작성자 이름이 나의 글(/my-posts)로 연결된다", () => {
    loginAs("u1");
    render(<PostArticle post={makePost("p1", { userId: "u1", user: { name: "서동찬", email: "a@a.com" } })} />);

    expect(screen.getByRole("link", { name: "서동찬 (a@a.com)" })).toHaveAttribute("href", "/my-posts");
  });

  it("작성자 정보가 없으면 링크 없이 '작성자 없음'을 보여준다", () => {
    loginAs(null);
    render(<PostArticle post={makePost("p1", { userId: null, user: null })} />);

    expect(screen.getByText("작성자 없음")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /작성자/ })).toBeNull();
  });

  it("왼쪽 카테고리 영역에 이 글의 작성자 id를 넘긴다 (남의 글이면 그 작성자의 카테고리를 보여주기 위해)", () => {
    loginAs(null);
    render(<PostArticle post={makePost("p1", { userId: "u1" })} />);

    expect(screen.getByTestId("outline")).toHaveAttribute("data-author-id", "u1");
  });
});

describe("PostArticle — 카테고리 경로", () => {
  function loginAs(userId: string | null) {
    vi.mocked(useSession).mockReturnValue({
      data: userId ? { user: { id: userId } } : null,
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  }

  it("제목 위에 카테고리 경로('학습 > AI')를 보여주고, 작성자 본인이면 각 이름이 나의 글 목록 링크다", () => {
    loginAs("u1");
    render(<PostArticle post={makePost("p1", { userId: "u1", category: "AI", categoryPath: ["학습", "AI"] })} />);

    const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
    expect(within(nav).getByRole("link", { name: "학습" })).toHaveAttribute(
      "href",
      `/my-posts?category=${encodeURIComponent("학습")}`,
    );
    expect(within(nav).getByRole("link", { name: "AI" })).toHaveAttribute("href", "/my-posts?category=AI");
  });

  it("다른 사람이 보면 같은 경로를 링크 없이 글자로만 보여준다", () => {
    loginAs(null);
    render(<PostArticle post={makePost("p1", { category: "AI", categoryPath: ["학습", "AI"] })} />);

    const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
    expect(within(nav).queryByRole("link")).toBeNull();
    expect(nav).toHaveTextContent("학습");
  });

  it("BE가 아직 경로를 안 보내면 카테고리 이름 하나만 보여준다", () => {
    loginAs("u1");
    render(<PostArticle post={makePost("p1", { userId: "u1", category: "학습" })} />);

    const nav = screen.getByRole("navigation", { name: "카테고리 경로" });
    expect(within(nav).getAllByRole("link")).toHaveLength(1);
  });
});

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

describe("PostArticle — 카테고리·목차 접기", () => {
  const withToc = () => makePost("p1", { content: "<h2>첫 제목</h2><p>본문</p>" });
  const tocNav = () => screen.getByRole("navigation", { name: "목차" });

  it("영역 헤더 줄의 아이콘 버튼으로 접고, 아이콘 자리를 비워 둔다 (카테고리·목차 모두)", () => {
    render(<PostArticle post={withToc()} />);

    expect(screen.getByTestId("outline").closest("aside")).toContainElement(
      screen.getByRole("button", { name: "카테고리 접기" }),
    );
    expect(screen.getByRole("button", { name: "목차 접기" }).closest("aside")).not.toBeNull();
    expect(screen.getByTestId("outline")).toHaveAttribute("data-header-class", OUTLINE_HEADER_CLASS);
    // 목차 제목도 아이콘 자리를 비우고 같은 높이로 맞춘다 (기본 pl-3은 덮어씀)
    const tocTitle = within(tocNav()).getByText("목차");
    expect(tocTitle).toHaveClass(...TOC_HEADER_CLASS.split(" "));
    expect(tocTitle).not.toHaveClass("pl-3");
  });

  it("접기 버튼은 영역 안에만 있고 본문(article) 안에는 없다", () => {
    render(<PostArticle post={withToc()} />);

    const article = screen.getByRole("article");
    expect(article).not.toContainElement(screen.getByRole("button", { name: "카테고리 접기" }));
    expect(article).not.toContainElement(screen.getByRole("button", { name: "목차 접기" }));
  });

  it("카테고리·목차를 접으면 각 컴포넌트에 collapsed가 전달되어 제목 줄만 남고 목록이 가려진다", async () => {
    const user = userEvent.setup();
    render(<PostArticle post={withToc()} />);
    expect(screen.getByTestId("outline")).toHaveAttribute("data-collapsed", "false");
    expect(within(tocNav()).getByRole("list")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "카테고리 접기" }));
    await user.click(screen.getByRole("button", { name: "목차 접기" }));

    expect(screen.getByTestId("outline")).toHaveAttribute("data-collapsed", "true");
    expect(within(tocNav()).getByText("목차")).toBeVisible(); // 제목은 남고
    expect(within(tocNav()).getByRole("list", { hidden: true })).not.toBeVisible(); // 목록만 가려진다
  });

  it("목차가 없는 글에는 목차 버튼이 없다", () => {
    render(<PostArticle post={makePost("p1", { content: "<p>본문만</p>" })} />);

    expect(screen.queryByRole("button", { name: /목차/ })).toBeNull();
    expect(screen.getByRole("button", { name: "카테고리 접기" })).toBeInTheDocument();
  });
});
