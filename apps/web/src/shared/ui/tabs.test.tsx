import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./tabs";

const TABS = [
  { id: "a", label: "첫째" },
  { id: "b", label: "둘째" },
  { id: "c", label: "셋째" },
];

function setup(value = "a") {
  const onChange = vi.fn();
  render(<Tabs tabs={TABS} value={value} onChange={onChange} ariaLabel="테스트 탭" idPrefix="t" />);
  return { onChange, user: userEvent.setup() };
}

describe("Tabs", () => {
  it("현재 탭만 선택 상태이고, 탭 버튼과 패널이 id로 연결된다", () => {
    setup("b");

    expect(screen.getByRole("tablist", { name: "테스트 탭" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "둘째" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "첫째" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "둘째" })).toHaveAttribute("id", "t-tab-b");
    expect(screen.getByRole("tab", { name: "둘째" })).toHaveAttribute("aria-controls", "t-panel-b");
  });

  it("탭을 누르면 그 탭의 id로 onChange가 불린다", async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole("tab", { name: "셋째" }));

    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("선택된 탭만 Tab 키로 포커스된다 (나머지는 화살표로 이동)", () => {
    setup("a");

    expect(screen.getByRole("tab", { name: "첫째" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "둘째" })).toHaveAttribute("tabindex", "-1");
  });

  it("오른쪽 화살표는 다음 탭으로 이동하고 그 탭에 포커스가 간다", async () => {
    const { onChange, user } = setup("a");
    screen.getByRole("tab", { name: "첫째" }).focus();

    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith("b");
    expect(screen.getByRole("tab", { name: "둘째" })).toHaveFocus();
  });

  it("첫 탭에서 왼쪽 화살표를 누르면 마지막 탭으로, 마지막에서 오른쪽은 첫 탭으로 순환한다", async () => {
    const first = setup("a");
    screen.getByRole("tab", { name: "첫째" }).focus();
    await first.user.keyboard("{ArrowLeft}");
    expect(first.onChange).toHaveBeenLastCalledWith("c");
  });

  it("Home/End 키로 처음·마지막 탭으로 이동한다", async () => {
    const { onChange, user } = setup("b");
    screen.getByRole("tab", { name: "둘째" }).focus();

    await user.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("c");
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("a");
  });
});
