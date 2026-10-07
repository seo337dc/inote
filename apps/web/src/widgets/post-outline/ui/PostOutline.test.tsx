import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import PostOutline from "./PostOutline";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const mockedUseSession = vi.mocked(useSession);

const OUTLINE = [
  { id: "p1", title: "리액트 쿼리", category: "학습", isPrivate: false, pinned: false },
  { id: "p2", title: "면접 후기", category: "이직", isPrivate: true, pinned: false },
];

function mockOutline(items = OUTLINE) {
  server.use(http.get(`${TEST_API_URL}/api/v1/blog/posts/outline`, () => HttpResponse.json(items)));
}

describe("PostOutline", () => {
  beforeEach(() => {
    // 비로그인: 카테고리는 기본 5개로 대체된다
    mockedUseSession.mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<typeof useSession>);
  });

  describe("collapsed", () => {
    it("접히면 제목('카테고리')만 남고 폴더 목록과 '관리' 링크는 가려진다", async () => {
      mockOutline();
      renderWithQueryClient(<PostOutline currentPostId="p1" collapsed />);

      expect(await screen.findByText("카테고리")).toBeVisible();
      expect(screen.queryByRole("link", { name: "관리" })).toBeNull();
      expect(screen.getByRole("button", { name: /학습/, hidden: true })).not.toBeVisible();
      expect(screen.getByRole("link", { name: "리액트 쿼리", hidden: true })).not.toBeVisible();
    });

    it("접지 않으면(기본) 목록과 '관리' 링크가 보인다", async () => {
      mockOutline();
      renderWithQueryClient(<PostOutline currentPostId="p1" />);

      expect(await screen.findByRole("link", { name: "관리" })).toBeVisible();
      expect(screen.getByRole("button", { name: /학습/ })).toBeVisible();
    });

    it("접었다 펼쳐도 직접 펼친 폴더가 그대로 남는다 — 목록을 언마운트하지 않고 숨기기만 한다", async () => {
      mockOutline();
      const user = userEvent.setup();
      // renderWithQueryClient의 rerender는 QueryClientProvider를 다시 감싸지 않으므로, 접고 펴는 버튼이 있는 하니스로 감싼다
      function Harness() {
        const [collapsed, setCollapsed] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setCollapsed((v) => !v)}>
              접기토글
            </button>
            <PostOutline currentPostId="p1" collapsed={collapsed} />
          </>
        );
      }
      renderWithQueryClient(<Harness />);
      const folder = await screen.findByRole("button", { name: /이직/ });
      expect(folder).toHaveAttribute("aria-expanded", "false");
      await user.click(folder); // 직접 펼침
      expect(screen.getByRole("button", { name: /이직/ })).toHaveAttribute("aria-expanded", "true");

      await user.click(screen.getByRole("button", { name: "접기토글" })); // 접기
      await user.click(screen.getByRole("button", { name: "접기토글" })); // 다시 펼치기

      expect(screen.getByRole("button", { name: /이직/ })).toHaveAttribute("aria-expanded", "true");
    });
  });

  it("headerClassName을 주면 헤더 줄(카테고리·관리)에 그 클래스가 붙고, 안 주면 기본 모양 그대로다", async () => {
    mockOutline();
    const { unmount } = renderWithQueryClient(<PostOutline currentPostId="p1" headerClassName="pl-7" />);
    const header = (await screen.findByText("카테고리")).parentElement!;
    expect(header).toHaveClass("pl-7", "flex", "justify-between");
    unmount();

    renderWithQueryClient(<PostOutline currentPostId="p1" />);
    const plain = (await screen.findByText("카테고리")).parentElement!;
    expect(plain).not.toHaveClass("pl-7");
  });

  it("지금 보는 글이 들어 있는 폴더만 펼쳐지고, 그 글이 현재 글로 표시된다", async () => {
    mockOutline();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);

    const current = await screen.findByRole("link", { name: "리액트 쿼리" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("href", "/posts/p1");
    expect(screen.getByRole("button", { name: /학습/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /이직/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /면접 후기/ })).not.toBeInTheDocument();
  });

  it("접힌 폴더를 누르면 펼쳐져 글이 보이고, 다시 누르면 접힌다", async () => {
    mockOutline();
    const user = userEvent.setup();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);
    await screen.findByRole("link", { name: "리액트 쿼리" });

    await user.click(screen.getByRole("button", { name: /이직/ }));
    expect(screen.getByRole("link", { name: /면접 후기/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /이직/ }));
    expect(screen.queryByRole("link", { name: /면접 후기/ })).not.toBeInTheDocument();
  });

  it("현재 글이 들어 있는 폴더도 직접 접을 수 있다", async () => {
    mockOutline();
    const user = userEvent.setup();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);
    await screen.findByRole("link", { name: "리액트 쿼리" });

    await user.click(screen.getByRole("button", { name: /학습/ }));

    expect(screen.queryByRole("link", { name: "리액트 쿼리" })).not.toBeInTheDocument();
  });

  it("글이 하나도 없으면 아무것도 그리지 않는다", async () => {
    mockOutline([]);
    const { container } = renderWithQueryClient(<PostOutline currentPostId="p1" />);

    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("각 카테고리 줄 맨 오른쪽에 그 카테고리의 글 목록 페이지로 가는 링크가 있다", async () => {
    mockOutline();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);

    const study = await screen.findByRole("link", { name: "학습 목록 보기" });
    expect(study).toHaveAttribute("href", `/?category=${encodeURIComponent("학습")}`);
    expect(screen.getByRole("link", { name: "이직 목록 보기" })).toHaveAttribute(
      "href",
      `/?category=${encodeURIComponent("이직")}`,
    );
    // 같은 줄에서 펼침 버튼 다음(오른쪽)에 온다
    const row = screen.getByRole("button", { name: /학습/ }).parentElement!;
    expect(row.lastElementChild).toBe(study);
  });

  it("목록 링크를 눌러도 폴더가 펼쳐지거나 접히지 않는다 (펼침은 버튼만 담당)", async () => {
    mockOutline();
    const user = userEvent.setup();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);
    await screen.findByRole("link", { name: "리액트 쿼리" });
    const link = screen.getByRole("link", { name: "학습 목록 보기" });
    link.addEventListener("click", (e) => e.preventDefault()); // jsdom 이동 방지

    await user.click(link);

    expect(screen.getByRole("button", { name: /학습/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("접히면 카테고리 목록 링크도 함께 가려진다", async () => {
    mockOutline();
    renderWithQueryClient(<PostOutline currentPostId="p1" collapsed />);

    expect(await screen.findByRole("link", { name: "학습 목록 보기", hidden: true })).not.toBeVisible();
  });

  it("카테고리 제목 옆에 관리 페이지로 가는 '관리' 링크가 있다", async () => {
    mockOutline();
    renderWithQueryClient(<PostOutline currentPostId="p1" />);

    const manage = await screen.findByRole("link", { name: "관리" });
    expect(manage).toHaveAttribute("href", "/categories");
  });
});
