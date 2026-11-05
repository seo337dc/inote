import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotebookText } from "lucide-react";
import ChatDock from "./ChatDock";
import { registerSlotAction } from "@/shared/lib/slot-actions";

vi.mock("next/navigation", () => ({ usePathname: () => "/write/1" }));
// 패널 내부(대화 목록 등)는 이 테스트의 관심사가 아니다 — 열림 여부만 본다.
vi.mock("./ChatPanel", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog">AI 패널</div> : null),
}));

const chat = {} as Parameters<typeof ChatDock>[0]["chat"];

describe("ChatDock", () => {
  it("등록된 추가 버튼이 없으면 AI 버튼만 보이고 누르면 AI 패널이 열린다", async () => {
    render(<ChatDock chat={chat} />);
    expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "AI 어시스턴트 열기" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("AI 패널");
  });

  it("추가 버튼이 등록되면 ⋮ 메뉴가 나오고, 누르면 메모와 AI 버튼이 펼쳐지며 ⋮ 버튼은 사라진다", async () => {
    const onMemo = vi.fn();
    let off = () => {};
    act(() => {
      off = registerSlotAction({ id: "memo", label: "메모", icon: NotebookText, onClick: onMemo });
    });
    render(<ChatDock chat={chat} />);

    // 처음에는 ⋮ 메뉴만 보이고 AI·메모 버튼은 접혀 있다
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI 어시스턴트 열기" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    expect(screen.getByRole("button", { name: "메모" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 어시스턴트 열기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    expect(onMemo).toHaveBeenCalledTimes(1);
    // 선택하면 펼침은 접히고 ⋮ 버튼이 다시 나온다
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
    act(() => off());
  });

  it("펼친 상태에서 Esc·바깥 클릭으로 접을 수 있고, AI 버튼을 누르면 AI 패널이 열린다", async () => {
    let off = () => {};
    act(() => {
      off = registerSlotAction({ id: "memo", label: "메모", icon: NotebookText, onClick: () => {} });
    });
    render(<ChatDock chat={chat} />);

    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();

    // 바깥(투명 오버레이)을 눌러도 접힌다
    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    await userEvent.click(document.querySelector('[aria-hidden="true"].fixed.inset-0') as HTMLElement);
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    await userEvent.click(screen.getByRole("button", { name: "AI 어시스턴트 열기" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("AI 패널");
    act(() => off());
  });
});
