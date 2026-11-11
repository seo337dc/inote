import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import PostActionsMenu from "./PostActionsMenu";
import { renderWithQueryClient as render } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";

// 글 상세 상단의 작성자 메뉴(⋯) — 고정·보관·임시저장으로 변경·삭제를 한 목록으로 모은다. (수정은 밖에 있는 링크라 여기 없다)
const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const API = `${TEST_API_URL}/api/v1/blog/posts`;

function setSession(userId: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: userId ? { user: { id: userId } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

// 발행된 내 글(u1). 필요한 필드만 바꿔서 쓴다
const publishedPost = (over: Partial<ReturnType<typeof makePost>> = {}) =>
  makePost("p1", { userId: "u1", publishedAt: "2026-11-01T00:00:00.000Z", archivedAt: null, pinned: false, ...over });

// 메뉴는 키보드(Enter)로 연다 — Base UI 메뉴가 jsdom에서 userEvent.click의 포인터 이벤트로는 열리지 않는다(실제 브라우저와는 무관)
async function pressTrigger() {
  const trigger = screen.getByRole("button", { name: "글 관리 메뉴" });
  trigger.focus();
  await userEvent.keyboard("{Enter}");
}
async function openMenu(post = publishedPost()) {
  render(<PostActionsMenu post={post} />);
  await pressTrigger();
}
const item = (name: string | RegExp) => screen.getByRole("menuitem", { name });

beforeEach(() => {
  vi.clearAllMocks();
  setSession("u1");
});

describe("PostActionsMenu — 보이는 조건과 항목", () => {
  it("작성자가 아니면 아무것도 보이지 않는다", () => {
    setSession("u2");
    render(<PostActionsMenu post={publishedPost()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("로그인하지 않았으면 아무것도 보이지 않는다", () => {
    setSession(null);
    render(<PostActionsMenu post={publishedPost()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("작성자에게는 ⋯ 버튼 하나만 보이고, 누르면 고정·보관·임시저장으로 변경·삭제가 목록으로 열린다", async () => {
    render(<PostActionsMenu post={publishedPost()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1); // 항목은 열기 전에는 보이지 않는다
    expect(screen.queryByRole("menuitem")).toBeNull();

    await pressTrigger();

    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["고정", "보관", "임시저장으로 변경", "삭제"]);
  });

  it("고정한 글이면 [고정 해제], 보관한 글이면 [보관 해제]로 보인다", async () => {
    await openMenu(publishedPost({ pinned: true, archivedAt: "2026-11-02T00:00:00.000Z" }));
    expect(item("고정 해제")).toBeInTheDocument();
    expect(item("보관 해제")).toBeInTheDocument();
  });

  it("보관한 글은 임시저장으로 바꿀 수 없다 — 항목이 비활성이고 이유를 보여준다", async () => {
    await openMenu(publishedPost({ archivedAt: "2026-11-02T00:00:00.000Z" }));
    const target = item(/임시저장으로 변경/);
    expect(target).toHaveAttribute("aria-disabled", "true");
    expect(target).toHaveTextContent("보관 해제 후");
  });

  it("임시저장(draft) 글에는 삭제만 있다 — 보관·임시저장으로 변경·고정은 의미가 없어 숨긴다", async () => {
    await openMenu(publishedPost({ publishedAt: null }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["삭제"]);
  });
});

describe("PostActionsMenu — 임시저장으로 변경", () => {
  it("항목을 누르면 먼저 확인창이 뜨고, 아직 요청은 보내지 않는다", async () => {
    let called = false;
    server.use(http.post(`${API}/p1/unpublish`, () => ((called = true), HttpResponse.json(publishedPost({ publishedAt: null })))));
    await openMenu();

    await userEvent.click(item(/임시저장으로 변경/));

    expect(await screen.findByText("이 글을 임시저장으로 바꾸시겠습니까?")).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("확인하면 POST /blog/posts/:id/unpublish를 부르고, 안내 후 임시저장 목록(/my-posts/drafts)으로 이동한다", async () => {
    let called = false;
    server.use(http.post(`${API}/p1/unpublish`, () => ((called = true), HttpResponse.json(publishedPost({ publishedAt: null })))));
    await openMenu();
    await userEvent.click(item(/임시저장으로 변경/));

    await userEvent.click(await screen.findByRole("button", { name: "임시저장으로 변경" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/my-posts/drafts"));
    expect(called).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });

  it("확인창에서 취소하면 요청도 이동도 없다", async () => {
    let called = false;
    server.use(http.post(`${API}/p1/unpublish`, () => ((called = true), HttpResponse.json({}))));
    await openMenu();
    await userEvent.click(item(/임시저장으로 변경/));

    await userEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(called).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("서버가 409(보관한 글)로 거절하면 이동하지 않고 안내한다", async () => {
    server.use(http.post(`${API}/p1/unpublish`, () => HttpResponse.json({ message: "archived" }, { status: 409 })));
    await openMenu();
    await userEvent.click(item(/임시저장으로 변경/));
    await userEvent.click(await screen.findByRole("button", { name: "임시저장으로 변경" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("보관")));
    expect(push).not.toHaveBeenCalled();
  });

  it("그 밖의 실패는 일반 안내를 하고 이동하지 않는다", async () => {
    server.use(http.post(`${API}/p1/unpublish`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    await openMenu();
    await userEvent.click(item(/임시저장으로 변경/));
    await userEvent.click(await screen.findByRole("button", { name: "임시저장으로 변경" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});

describe("PostActionsMenu — 고정·보관·삭제 (기존 버튼 동작 그대로)", () => {
  it("고정: PATCH { pinned: true }를 보내고 화면을 새로 고친다", async () => {
    let body: unknown;
    server.use(http.patch(`${API}/p1`, async ({ request }) => ((body = await request.json()), HttpResponse.json({}))));
    await openMenu();

    await userEvent.click(item("고정"));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(body).toEqual({ pinned: true });
  });

  it("보관: 이 글의 id 하나로 archive를 부르고, 다시 열면 [보관 해제]로 바뀌어 있다", async () => {
    let body: unknown;
    server.use(http.post(`${API}/archive`, async ({ request }) => ((body = await request.json()), HttpResponse.json({ archivedIds: ["p1"] }))));
    await openMenu();

    await userEvent.click(item("보관"));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(body).toEqual({ ids: ["p1"] });
    await pressTrigger();
    expect(await screen.findByRole("menuitem", { name: "보관 해제" })).toBeInTheDocument();
  });

  it("보관: 서버가 건너뛰어 처리된 글이 없으면 상태를 바꾸지 않고 안내한다", async () => {
    server.use(http.post(`${API}/archive`, () => HttpResponse.json({ archivedIds: [] })));
    await openMenu();

    await userEvent.click(item("보관"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("삭제: 확인창에서 삭제를 누르면 DELETE 후 홈으로 이동한다", async () => {
    let called = false;
    server.use(http.delete(`${API}/p1`, () => ((called = true), new HttpResponse(null, { status: 204 }))));
    await openMenu();
    await userEvent.click(item("삭제"));
    expect(await screen.findByText("이 글을 삭제하시겠습니까?")).toBeInTheDocument();
    expect(called).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(called).toBe(true);
  });

  it("삭제: 취소하면 요청이 없다", async () => {
    let called = false;
    server.use(http.delete(`${API}/p1`, () => ((called = true), new HttpResponse(null, { status: 204 }))));
    await openMenu();
    await userEvent.click(item("삭제"));

    await userEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(called).toBe(false);
  });
});
