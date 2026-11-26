import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TodosPage from "./TodosPage";
import { useSession } from "@/shared/lib/auth-client";
import { useTodos } from "@/entities/todo";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
vi.mock("@/entities/todo", () => ({
  useTodos: vi.fn(),
  useCreateTodo: () => ({ mutate: vi.fn() }),
  useUpdateTodo: () => ({ mutate: vi.fn() }),
  useDeleteTodo: () => ({ mutate: vi.fn() }),
}));

const todo = { id: "t1", title: "장보기", done: false, dueDate: null };

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as unknown as ReturnType<typeof useSession>);
  vi.mocked(useTodos).mockReturnValue({ data: [todo], isPending: false } as unknown as ReturnType<typeof useTodos>);
});

describe("TodosPage 삭제 버튼", () => {
  // 마우스를 올려야만 보이는 버튼은 hover가 없는 터치 기기(태블릿·모바일)에서 영영 보이지 않아 삭제할 수 없다.
  // jsdom은 미디어 쿼리를 계산하지 못하므로, hover 기기에서만 숨기는 규칙이 클래스에 있는지로 확인한다 (PostMover와 같은 패턴).
  it("hover가 있는 기기에서만 숨기고, 터치 기기에서는 항상 보인다", () => {
    render(<TodosPage />);
    const classes = screen.getByRole("button", { name: "삭제" }).className.split(/\s+/);
    expect(classes).not.toContain("opacity-0");
    expect(classes).toContain("[@media(hover:hover)]:opacity-0");
  });

  it("키보드로 포커스가 가면 보인다", () => {
    render(<TodosPage />);
    expect(screen.getByRole("button", { name: "삭제" }).className.split(/\s+/)).toContain("focus-visible:opacity-100");
  });
});
