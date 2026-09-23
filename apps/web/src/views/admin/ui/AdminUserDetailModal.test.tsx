import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminUserDetailModal from "./AdminUserDetailModal";
import { useAdminUser, type AdminUserDetail } from "../model/useAdminUser";
import { useDeleteAdminUser } from "../model/useDeleteAdminUser";

vi.mock("../model/useAdminUser", () => ({
  useAdminUser: vi.fn(),
}));

vi.mock("../model/useDeleteAdminUser", () => ({
  useDeleteAdminUser: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const mockedUseAdminUser = vi.mocked(useAdminUser);
const mockedUseDeleteAdminUser = vi.mocked(useDeleteAdminUser);

const BASE_USER: AdminUserDetail = {
  id: "user-1",
  name: "홍길동",
  nickname: null,
  email: "test@example.com",
  emailVerified: true,
  phone: null,
  image: null,
  role: "USER",
  usesInote: true,
  usesInoteMoney: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockUser(overrides: Partial<AdminUserDetail> = {}) {
  mockedUseAdminUser.mockReturnValue({
    data: { ...BASE_USER, ...overrides },
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useAdminUser>);
}

describe("AdminUserDetailModal", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDeleteAdminUser.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteAdminUser>);
  });

  it("앱 이용 현황에 usesInote/usesInoteMoney 값대로 뱃지를 보여준다", () => {
    mockUser({ usesInote: true, usesInoteMoney: false });
    render(<AdminUserDetailModal userId="user-1" onClose={vi.fn()} />);

    expect(screen.getByText("앱 이용 현황")).toBeInTheDocument();
    expect(screen.getByText("사용")).toBeInTheDocument();
    expect(screen.getByText("미사용")).toBeInTheDocument();
  });

  it("삭제 클릭 시 확인 팝업이 뜬다", async () => {
    const user = userEvent.setup();
    mockUser();
    render(<AdminUserDetailModal userId="user-1" onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(screen.getByText("정말 삭제하시겠습니까?")).toBeInTheDocument();
  });

  it("확인 팝업에서 취소하면 mutate가 호출되지 않는다", async () => {
    const user = userEvent.setup();
    mockUser();
    render(<AdminUserDetailModal userId="user-1" onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByText("정말 삭제하시겠습니까?")).not.toBeInTheDocument();
  });

  it("확인 팝업에서 삭제하기를 누르면 해당 userId로 mutate가 호출된다", async () => {
    const user = userEvent.setup();
    mockUser();
    render(<AdminUserDetailModal userId="user-1" onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제하기" }));

    expect(mutate).toHaveBeenCalledWith("user-1", expect.anything());
  });
});
