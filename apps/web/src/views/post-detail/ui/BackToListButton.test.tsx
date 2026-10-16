import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackToListButton from "./BackToListButton";

const back = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

function setHistoryLength(length: number) {
  Object.defineProperty(window.history, "length", { value: length, configurable: true });
}

describe("BackToListButton", () => {
  beforeEach(() => {
    back.mockClear();
    push.mockClear();
  });
  afterEach(() => setHistoryLength(1));

  it("'← 목록으로' 텍스트 버튼으로 보인다", () => {
    render(<BackToListButton />);

    expect(screen.getByRole("button", { name: "← 목록으로" })).toBeInTheDocument();
  });

  it("이전 화면이 있으면 그리로 돌아간다 (목록의 필터·페이지·검색 상태 그대로)", async () => {
    setHistoryLength(3);
    render(<BackToListButton />);

    await userEvent.click(screen.getByRole("button", { name: "← 목록으로" }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("이전 화면이 없으면(새 탭·주소로 바로 진입) 전체 글 목록(/)으로 간다", async () => {
    setHistoryLength(1);
    render(<BackToListButton />);

    await userEvent.click(screen.getByRole("button", { name: "← 목록으로" }));

    expect(push).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});
