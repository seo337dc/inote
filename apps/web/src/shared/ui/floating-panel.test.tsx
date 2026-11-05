import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingPanel } from "./floating-panel";

// 드래그·리사이즈는 jsdom에서 재현할 수 없어(react-rnd 내부) 껍데기로 대체한다.
// 여기서는 패널 자체의 열림/닫힘/헤더 동작만 확인하고, 실제 드래그는 화면에서 사람이 확인한다.
vi.mock("react-rnd", () => ({
  Rnd: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("FloatingPanel", () => {
  it("open이 false면 아무것도 렌더링하지 않는다", () => {
    render(
      <FloatingPanel open={false} onClose={() => {}} title="메모">
        <p>내용</p>
      </FloatingPanel>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("open이면 제목과 children을 보여준다", async () => {
    render(
      <FloatingPanel open onClose={() => {}} title="메모">
        <p>내용</p>
      </FloatingPanel>,
    );
    expect(await screen.findByRole("dialog", { name: "메모" })).toBeInTheDocument();
    expect(screen.getByText("내용")).toBeInTheDocument();
  });

  it("닫기 버튼을 누르면 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(
      <FloatingPanel open onClose={onClose} title="메모">
        <p>내용</p>
      </FloatingPanel>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
