import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthNavAction from "./AuthNavAction";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn(), authClient: { signOut: vi.fn() } }));

function setUser(role?: string) {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1", name: "me", email: "m@x.com", role } },
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

beforeEach(() => vi.clearAllMocks());

describe("AuthNavAction — 메모 관리 항목", () => {
  it("사용자 메뉴(드롭다운)에 '메모 관리' 항목이 있고 /memos로 간다 — 내 정보 보기 다음", async () => {
    setUser();
    render(<AuthNavAction />);

    screen.getByRole("button", { name: /me 님/ }).focus();
    await userEvent.keyboard("{Enter}");

    const links = (await screen.findAllByRole("menuitem")).map((i) => [i.textContent, i.getAttribute("href")]);
    expect(links.slice(0, 2)).toEqual([
      ["내 정보 보기", "/profile"],
      ["메모 관리", "/memos"],
    ]);
  });

  it("모바일 inline 메뉴에도 '메모 관리' 링크가 있다", () => {
    setUser();
    render(<AuthNavAction variant="inline" />);

    expect(screen.getByRole("link", { name: "메모 관리" })).toHaveAttribute("href", "/memos");
  });

  it("관리자 항목은 그대로 유지된다", () => {
    setUser("ADMIN");
    render(<AuthNavAction variant="inline" />);

    expect(screen.getByRole("link", { name: "관리자 페이지" })).toHaveAttribute("href", "/admin");
  });
});
