import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import MyDraftsPage from "./MyDraftsPage";
import { renderWithQueryClient as render } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";

// 나의 글의 [임시저장] 탭 — 발행 전 글(draft)만 모아 보고, 누르면 이어 쓰는 화면으로 간다. 계약: docs/todo/post-unpublish.md
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const DRAFTS_URL = `${TEST_API_URL}/api/v1/blog/posts/mine/drafts`;

function setSession(loggedIn: boolean) {
  vi.mocked(useSession).mockReturnValue({
    data: loggedIn ? { user: { id: "u1" } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}
const draft = (id: string, over: Partial<ReturnType<typeof makePost>> = {}) =>
  makePost(id, { userId: "u1", publishedAt: null, lastEditedAt: null, updatedAt: "2026-11-10T05:30:00.000Z", ...over });
const serve = (drafts: ReturnType<typeof makePost>[]) => server.use(http.get(DRAFTS_URL, () => HttpResponse.json(drafts)));

beforeEach(() => {
  vi.clearAllMocks();
  setSession(true);
});

describe("MyDraftsPage", () => {
  it("로그인하지 않았으면 로그인 화면으로 보낸다", async () => {
    setSession(false);
    serve([]);
    render(<MyDraftsPage />);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("[임시저장] 탭이 선택된 채로 탭 줄이 보이고, 제목에 글 수가 나온다", async () => {
    serve([draft("a", { title: "가" }), draft("b", { title: "나" })]);
    render(<MyDraftsPage />);

    await screen.findByText("가");
    expect(screen.getByRole("link", { name: "임시저장" })).toHaveAttribute("aria-current", "page");
    // 제목 옆에 글 수가 붙는다 ("임시저장 2") — 나의 글 목록 머리글과 같은 모양
    expect(screen.getByRole("heading", { name: "임시저장" }).parentElement).toHaveTextContent("임시저장2");
  });

  it("내 임시저장 글을 서버가 준 순서(최근 수정순)대로 보여주고, 각 글은 이어 쓰는 화면(/write/:id)으로 연결된다", async () => {
    serve([draft("b", { title: "나중에 수정" }), draft("a", { title: "먼저 수정" })]);
    render(<MyDraftsPage />);

    await screen.findByText("나중에 수정");
    const cards = screen.getAllByRole("link", { name: /수정/ });
    expect(cards.map((c) => c.getAttribute("href"))).toEqual(["/write/b", "/write/a"]);
  });

  it("본문은 HTML 태그를 빼고 글자만 미리 보여준다", async () => {
    serve([draft("a", { title: "글", content: "<h2>소제목</h2><p>첫 문단 <strong>강조</strong></p>" })]);
    render(<MyDraftsPage />);

    expect(await screen.findByText(/소제목 첫 문단 강조/)).toBeInTheDocument();
    expect(screen.queryByText(/<p>/)).toBeNull();
  });

  it("제목이 없으면 '제목 없음', 본문이 없으면 '내용 없음'으로 보인다", async () => {
    serve([draft("a", { title: "", content: "<p></p>" })]);
    render(<MyDraftsPage />);

    expect(await screen.findByText("제목 없음")).toBeInTheDocument();
    expect(screen.getByText("내용 없음")).toBeInTheDocument();
  });

  it("마지막 수정 시각을 보여준다", async () => {
    serve([draft("a", { title: "글" })]);
    render(<MyDraftsPage />);

    expect(await screen.findByText(/최종 수정/)).toBeInTheDocument();
  });

  it("임시저장 글이 없으면 전용 안내를 보여준다", async () => {
    serve([]);
    render(<MyDraftsPage />);

    expect(await screen.findByText("임시저장한 글이 없어요.")).toBeInTheDocument();
  });

  it("불러오기에 실패하면 로딩에 갇히지 않고 다시 시도할 수 있다", async () => {
    let fail = true;
    server.use(
      http.get(DRAFTS_URL, () => (fail ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json([draft("a", { title: "복구됨" })]))),
    );
    render(<MyDraftsPage />);

    const retry = await screen.findByRole("button", { name: /다시 시도/ });
    fail = false;
    await userEvent.click(retry);

    expect(await screen.findByText("복구됨")).toBeInTheDocument();
  });
});
