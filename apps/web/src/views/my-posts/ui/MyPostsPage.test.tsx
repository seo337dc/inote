import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import MyPostsPage from "./MyPostsPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost, makePostListPage } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
// next/form은 라우터 컨텍스트가 필요해서 검색 폼은 비워 둔다 (이 테스트의 관심사가 아님)
vi.mock("@/widgets/post-list/ui/PostSearchForm", () => ({ default: () => null }));

function serve(items: ReturnType<typeof makePost>[], onRequest?: (url: URL) => void) {
  server.use(
    http.get(`${TEST_API_URL}/api/v1/blog/posts/mine`, ({ request }) => {
      onRequest?.(new URL(request.url));
      return HttpResponse.json({ ...makePostListPage({ items, total: items.length }), categoryCounts: {} });
    }),
    http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json([])),
  );
}

function renderPage(archived: boolean) {
  return renderWithQueryClient(<MyPostsPage categoryId={null} page={1} pinnedPage={1} q={null} archived={archived} />);
}

describe("MyPostsPage — 보관함", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as unknown as ReturnType<typeof useSession>);
  });

  it("나의 글은 archived 없이, 보관함은 archived=true로 목록을 부른다", async () => {
    const urls: URL[] = [];
    serve([makePost("a", { title: "가" })], (url) => urls.push(url));

    renderPage(false);
    await screen.findByText("가");
    expect(urls[0].searchParams.has("archived")).toBe(false);
  });

  it("보관함 제목·탭이 보이고 글쓰기 버튼은 없다", async () => {
    const urls: URL[] = [];
    serve([makePost("a", { title: "보관한 글" })], (url) => urls.push(url));

    renderPage(true);

    await screen.findByText("보관한 글");
    expect(screen.getByRole("heading", { name: /보관함/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "글쓰기" })).toBeNull();
    expect(urls[0].searchParams.get("archived")).toBe("true");
  });

  it("보관함이 비었으면 전용 안내를 보여준다", async () => {
    serve([]);

    renderPage(true);

    expect(await screen.findByText("보관한 글이 없어요.")).toBeInTheDocument();
  });

  it("[선택]을 누르기 전에는 체크박스가 없고, 누르면 나타난다", async () => {
    serve([makePost("a", { title: "가" })]);
    renderPage(false);
    await screen.findByText("가");
    expect(screen.queryByRole("checkbox")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "선택" }));

    expect(screen.getByRole("checkbox", { name: "가 선택" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "선택한 글 작업" })).toBeInTheDocument();
  });

  it("글을 골라 [보관하기]를 누르면 고른 id만 archive로 보내고 선택 모드가 닫힌다", async () => {
    serve([makePost("a", { title: "가" }), makePost("b", { title: "나" })]);
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ archivedIds: ["b"] });
      }),
    );
    renderPage(false);
    await screen.findByText("가");
    await userEvent.click(screen.getByRole("button", { name: "선택" }));

    await userEvent.click(screen.getByRole("checkbox", { name: "나 선택" }));
    await userEvent.click(screen.getByRole("button", { name: "보관하기" }));

    await waitFor(() => expect(screen.queryByRole("toolbar")).toBeNull());
    expect(body).toEqual({ ids: ["b"] });
  });

  it("[이 페이지 전체 선택]은 보이는 글을 모두 고른다", async () => {
    serve([makePost("a", { title: "가" }), makePost("b", { title: "나" })]);
    renderPage(false);
    await screen.findByText("가");
    await userEvent.click(screen.getByRole("button", { name: "선택" }));

    await userEvent.click(screen.getByRole("button", { name: "이 페이지 전체 선택" }));

    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "가 선택" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "나 선택" })).toBeChecked();
  });

  it("[선택 취소]를 누르면 선택이 사라지고 체크박스도 없어진다", async () => {
    serve([makePost("a", { title: "가" })]);
    renderPage(false);
    await screen.findByText("가");
    await userEvent.click(screen.getByRole("button", { name: "선택" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "가 선택" }));

    await userEvent.click(screen.getByRole("button", { name: "선택 취소" }));

    expect(screen.queryByRole("checkbox")).toBeNull();
    // 다시 켜면 이전 선택은 남아 있지 않다
    await userEvent.click(screen.getByRole("button", { name: "선택" }));
    expect(screen.getByRole("checkbox", { name: "가 선택" })).not.toBeChecked();
  });
});

describe("MyPostsPage — 불러오기 실패", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as unknown as ReturnType<typeof useSession>);
  });

  it("목록 조회가 실패하면 로딩 화면에 갇히지 않고 안내와 [다시 시도]를 보여준다", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts/mine`, () => HttpResponse.json({ message: "fail" }, { status: 500 })),
      http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json([])),
    );

    renderPage(false);

    expect(await screen.findByRole("alert")).toHaveTextContent("불러오지 못했어요");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("[다시 시도]를 누르면 다시 불러와 성공하면 목록이 보인다", async () => {
    let calls = 0;
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts/mine`, () => {
        calls += 1;
        if (calls === 1) return HttpResponse.json({ message: "fail" }, { status: 500 });
        return HttpResponse.json({ ...makePostListPage({ items: [makePost("a", { title: "가" })], total: 1 }), categoryCounts: {} });
      }),
      http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json([])),
    );
    renderPage(false);
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("가")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls).toBe(2);
  });
});
