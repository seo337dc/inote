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
});
