import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodosPage from "./TodosPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { useSession } from "@/shared/lib/auth-client";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function mockSession(value: { data: unknown; isPending: boolean }) {
  vi.mocked(useSession).mockReturnValue(value as unknown as ReturnType<typeof useSession>);
}

describe("TodosPage (할 일 페이지)", () => {
  beforeEach(() => {
    replace.mockClear();
    server.use(...createTodoHandlers(createTodoStore()));
  });

  it("로그인했으면 제목·설명과 [오늘의 할일 | 할 일] 탭을 보여주고, 처음엔 오늘의 할일이 열린다", async () => {
    mockSession({ data: { user: { id: "u1" } }, isPending: false });
    renderWithQueryClient(<TodosPage />);

    expect(screen.getByRole("heading", { name: "할 일", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("나만 보는 개인 할 일 목록입니다.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "오늘의 할일" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "할 일" })).toHaveAttribute("aria-selected", "false");
    expect(await screen.findByText("· 오늘")).toBeInTheDocument();
  });

  it("'할 일' 탭을 누르면 오늘 카드가 사라지고 그 탭 내용으로 바뀐다", async () => {
    mockSession({ data: { user: { id: "u1" } }, isPending: false });
    const user = userEvent.setup();
    renderWithQueryClient(<TodosPage />);
    await screen.findByText("· 오늘");

    await user.click(screen.getByRole("tab", { name: "할 일" }));

    expect(screen.queryByText("· 오늘")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "할 일" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("region", { name: "오늘 일정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 묶음" })).toBeInTheDocument();
  });

  it("로그인하지 않았으면 /login으로 보낸다", () => {
    mockSession({ data: null, isPending: false });
    renderWithQueryClient(<TodosPage />);

    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByRole("tab", { name: "오늘의 할일" })).not.toBeInTheDocument();
  });

  it("세션을 확인하는 동안에는 탭을 그리지 않고, 이동도 하지 않는다", () => {
    mockSession({ data: null, isPending: true });
    renderWithQueryClient(<TodosPage />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("tab", { name: "오늘의 할일" })).not.toBeInTheDocument();
  });
});
