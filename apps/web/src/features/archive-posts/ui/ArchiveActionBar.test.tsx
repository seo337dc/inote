import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import ArchiveActionBar from "./ArchiveActionBar";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup(overrides: Partial<React.ComponentProps<typeof ArchiveActionBar>> = {}) {
  const props = {
    archived: false,
    selectedIds: ["a", "b"],
    pageIds: ["a", "b", "c"],
    onSelectPage: vi.fn(),
    onClear: vi.fn(),
    onDone: vi.fn(),
    ...overrides,
  };
  renderWithQueryClient(<ArchiveActionBar {...props} />);
  return props;
}

describe("ArchiveActionBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("선택한 개수를 보여준다", () => {
    setup();

    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();
  });

  it("나의 글에서는 실행 버튼이 [보관하기]다", () => {
    setup({ archived: false });
    expect(screen.getByRole("button", { name: "보관하기" })).toBeInTheDocument();
  });

  it("보관함이면 버튼이 [보관 해제하기]다", () => {
    setup({ archived: true });

    expect(screen.getByRole("button", { name: "보관 해제하기" })).toBeInTheDocument();
  });

  it("선택한 글이 없으면 실행 버튼이 비활성이다", () => {
    setup({ selectedIds: [] });

    expect(screen.getByRole("button", { name: "보관하기" })).toBeDisabled();
  });

  it("[이 페이지 전체 선택]은 화면에 보이는 글 id 전부로 onSelectPage를 부른다", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "이 페이지 전체 선택" }));

    expect(props.onSelectPage).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("[선택 해제]는 선택만 비운다 (선택 모드는 유지)", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "선택 해제" }));

    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(props.onDone).not.toHaveBeenCalled();
  });

  it("보관하면 선택한 id로 archive를 부르고, 안내를 띄운 뒤 선택 모드를 닫는다", async () => {
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ archivedIds: ["a", "b"] });
      }),
    );
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "보관하기" }));

    await waitFor(() => expect(props.onDone).toHaveBeenCalled());
    expect(body).toEqual({ ids: ["a", "b"] });
    expect(toast.success).toHaveBeenCalledWith("2개의 글을 보관함으로 옮겼어요.");
    expect(refresh).toHaveBeenCalled(); // 홈 목록(서버 렌더)도 다시 불러온다
  });

  it("보관함에서는 unarchive를 부른다", async () => {
    let called = false;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/unarchive`, () => {
        called = true;
        return HttpResponse.json({ unarchivedIds: ["a", "b"] });
      }),
    );
    const props = setup({ archived: true });

    await userEvent.click(screen.getByRole("button", { name: "보관 해제하기" }));

    await waitFor(() => expect(props.onDone).toHaveBeenCalled());
    expect(called).toBe(true);
  });

  it("실패하면 오류 안내를 띄우고 선택 모드를 닫지 않는다", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/v1/blog/posts/archive`, () => HttpResponse.json({ message: "x" }, { status: 500 })),
    );
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "보관하기" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(props.onDone).not.toHaveBeenCalled();
  });
});
