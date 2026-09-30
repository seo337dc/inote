import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoriesPage from "./CategoriesPage";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/features/manage-categories", () => ({ CategoryManager: () => <p>구조 관리 화면</p> }));
vi.mock("@/features/move-posts", () => ({ PostMover: () => <p>글 이동 화면</p> }));
vi.mock("@/shared/ui/page-loading", () => ({ PageLoading: () => <p>로딩 중</p> }));

function setSession(state: "pending" | "none" | "user") {
  vi.mocked(useSession).mockReturnValue({
    data: state === "user" ? { user: { id: "u1" } } : null,
    isPending: state === "pending",
  } as unknown as ReturnType<typeof useSession>);
}

describe("CategoriesPage", () => {
  beforeEach(() => {
    replace.mockClear();
    setSession("user");
  });

  it("처음에는 '카테고리 구조' 탭이 선택되어 구조 관리 화면이 보인다", () => {
    render(<CategoriesPage />);

    expect(screen.getByRole("tab", { name: "카테고리 구조" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("구조 관리 화면")).toBeInTheDocument();
    expect(screen.queryByText("글 이동 화면")).not.toBeInTheDocument();
  });

  it("'글 이동' 탭을 누르면 글 이동 화면으로 바뀌고 설명 문구도 바뀐다", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />);

    await user.click(screen.getByRole("tab", { name: "글 이동" }));

    expect(screen.getByText("글 이동 화면")).toBeInTheDocument();
    expect(screen.queryByText("구조 관리 화면")).not.toBeInTheDocument();
    expect(screen.getByText("글을 끌어서 다른 카테고리 폴더로 옮겨요.")).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "categories-tab-posts");
  });

  it("탭을 오가도 각 탭 화면이 다시 정상적으로 나온다", async () => {
    const user = userEvent.setup();
    render(<CategoriesPage />);

    await user.click(screen.getByRole("tab", { name: "글 이동" }));
    await user.click(screen.getByRole("tab", { name: "카테고리 구조" }));

    expect(screen.getByText("구조 관리 화면")).toBeInTheDocument();
  });

  it("로그인하지 않았으면 로그인 화면으로 보낸다", () => {
    setSession("none");
    render(<CategoriesPage />);

    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.getByText("로딩 중")).toBeInTheDocument();
  });
});
