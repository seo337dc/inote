import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Folder } from "lucide-react";
import { registerSlotAction } from "@/shared/lib/slot-actions";
import NavMobile from "./NavMobile";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
// 이 테스트의 관심사는 헤더 배치뿐 — 서버·세션이 필요한 자식은 비운다
vi.mock("./DraftNotificationBell", () => ({ default: () => <div data-testid="bell" /> }));
vi.mock("./AuthNavAction", () => ({ default: () => null }));

const offs: Array<() => void> = [];
afterEach(() => {
  while (offs.length) offs.pop()!();
});

function header() {
  return document.querySelector("header") as HTMLElement;
}

describe("NavMobile 헤더 배치", () => {
  it("왼쪽 슬롯에 등록된 것이 없어도 3칸 구조라서 로고가 가운데 칸에 있다", () => {
    render(<NavMobile />);

    const [left, center, right] = Array.from(header().children);
    expect(left.children).toHaveLength(0);
    expect(center.matches('a[href="/"]')).toBe(true); // 로고 링크가 가운데 칸
    expect(right.querySelector('[data-testid="bell"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
  });

  it("왼쪽 슬롯에 등록한 버튼이 왼쪽에 나타나고 누르면 등록한 동작이 실행된다", async () => {
    const onClick = vi.fn();
    render(<NavMobile />);
    act(() => {
      offs.push(
        registerSlotAction({ id: "settings", slot: "header-left", label: "글 설정", icon: Folder, onClick }),
      );
    });

    const button = screen.getByRole("button", { name: "글 설정" });
    expect(Array.from(header().children)[0]).toContainElement(button);
    expect(Array.from(header().children)[1].matches('a[href="/"]')).toBe(true);

    await userEvent.setup().click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("dock 슬롯에 등록한 버튼은 헤더 왼쪽에 나타나지 않는다", () => {
    render(<NavMobile />);
    act(() => {
      offs.push(registerSlotAction({ id: "memo", label: "메모", icon: Folder, onClick: vi.fn() }));
    });

    expect(screen.queryByRole("button", { name: "메모" })).toBeNull();
  });
});
