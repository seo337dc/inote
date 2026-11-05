import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoPad } from "./MemoPad";
import { MEMO_MAX_LENGTH } from "../model/constants";
import { useSlotActions } from "@/shared/lib/slot-actions";

// 드래그·리사이즈는 jsdom에서 재현할 수 없어 껍데기로 대체 (실제 동작은 화면에서 확인)
vi.mock("react-rnd", () => ({
  Rnd: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// jsdom에는 matchMedia가 없다 — 데스크톱(lg 이상)/좁은 화면을 흉내 낸다.
function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  // @ts-expect-error 테스트 간 오염 방지
  delete window.matchMedia;
});

describe("MemoPad (데스크톱)", () => {
  it("처음에는 메모장이 닫혀 있고 버튼을 누르면 열린다", async () => {
    setViewport(true);
    render(<MemoPad />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    expect(await screen.findByRole("dialog", { name: "메모" })).toBeInTheDocument();
  });

  it("메모장이 열려 있는 동안에는 메모 버튼이 숨겨지고, 닫으면 다시 보인다", async () => {
    setViewport(true);
    render(<MemoPad />);
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    await screen.findByRole("dialog", { name: "메모" });
    expect(screen.queryByRole("button", { name: "메모" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.getByRole("button", { name: "메모" })).toBeInTheDocument();
  });

  it("입력하면 글자 수가 갱신되고 최대 글자 수가 제한된다", async () => {
    setViewport(true);
    render(<MemoPad />);
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    const textarea = await screen.findByLabelText("메모 내용");
    expect(textarea).toHaveAttribute("maxLength", String(MEMO_MAX_LENGTH));
    await userEvent.type(textarea, "안녕");
    expect(screen.getByText("2 / 10,000")).toBeInTheDocument();
  });

  it("닫았다가 다시 열어도 입력한 내용이 남아 있다", async () => {
    setViewport(true);
    render(<MemoPad />);
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    await userEvent.type(await screen.findByLabelText("메모 내용"), "기억해");
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "메모" }));
    expect(await screen.findByLabelText("메모 내용")).toHaveValue("기억해");
  });
});

describe("MemoPad (좁은 화면)", () => {
  function DockProbe() {
    const actions = useSlotActions();
    return (
      <>
        {actions.map((a) => (
          <button key={a.id} type="button" onClick={a.onClick}>
            도크:{a.label}
          </button>
        ))}
      </>
    );
  }

  it("마운트되면 모바일 도크에 메모 버튼을 등록하고, 언마운트하면 해제한다", () => {
    setViewport(false);
    const { unmount } = render(
      <>
        <MemoPad />
        <DockProbe />
      </>,
    );
    expect(screen.getByRole("button", { name: "도크:메모" })).toBeInTheDocument();
    unmount();
    const probe = render(<DockProbe />);
    expect(probe.queryByRole("button", { name: "도크:메모" })).not.toBeInTheDocument();
  });

  it("도크의 메모 버튼을 누르면 플로팅 패널이 아니라 하단 패널로 열린다", async () => {
    setViewport(false);
    render(
      <>
        <MemoPad />
        <DockProbe />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "도크:메모" }));
    const dialog = await screen.findByRole("dialog", { name: "메모" });
    expect(dialog.className).toContain("rounded-t-lg");
    expect(dialog).toHaveClass("memo-sheet-in"); // 아래에서 위로 올라오는 애니메이션
    expect(screen.getByLabelText("메모 내용")).toBeInTheDocument();
  });

  it("하단 패널은 닫기 버튼과 바깥 영역 클릭으로 닫히고 내용은 유지된다", async () => {
    setViewport(false);
    render(
      <>
        <MemoPad />
        <DockProbe />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "도크:메모" }));
    await userEvent.type(await screen.findByLabelText("메모 내용"), "모바일");
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    // 내려가는 애니메이션(300ms)이 끝난 뒤에 사라진다
    expect(screen.getByRole("dialog")).toHaveClass("memo-sheet-out");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "도크:메모" }));
    expect(await screen.findByLabelText("메모 내용")).toHaveValue("모바일");
    // 어두운 바깥 영역(aria-hidden 오버레이)을 누르면 닫힌다
    const overlay = document.querySelector('[aria-hidden="true"].bg-black\\/30') as HTMLElement;
    await userEvent.click(overlay);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
