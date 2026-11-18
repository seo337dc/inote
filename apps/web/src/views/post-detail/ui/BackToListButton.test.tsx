import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rememberListUrl } from "@/shared/lib/list-url";
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
  afterEach(() => {
    setHistoryLength(1);
    sessionStorage.clear();
  });

  it("'← 목록으로' 텍스트 버튼으로 보인다", () => {
    render(<BackToListButton />);

    expect(screen.getByRole("button", { name: "← 목록으로" })).toBeInTheDocument();
  });

  it("마지막으로 본 목록(필터·페이지·검색 상태 포함)으로 간다", async () => {
    rememberListUrl("/my-posts?categoryId=3&page=2&q=react");
    render(<BackToListButton />);

    await userEvent.click(screen.getByRole("button", { name: "← 목록으로" }));

    expect(push).toHaveBeenCalledWith("/my-posts?categoryId=3&page=2&q=react");
  });

  it("브라우저 기록에 이전 화면(다른 글 상세·/write·외부 사이트 등)이 있어도 그리로 가지 않는다", async () => {
    setHistoryLength(5);
    rememberListUrl("/?page=2");
    render(<BackToListButton />);

    await userEvent.click(screen.getByRole("button", { name: "← 목록으로" }));

    expect(back).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/?page=2");
  });

  it("기록된 목록이 없으면(새 탭·주소로 바로 진입) 기록 길이와 상관없이 전체 글 목록(/)으로 간다", async () => {
    setHistoryLength(5);
    render(<BackToListButton />);

    await userEvent.click(screen.getByRole("button", { name: "← 목록으로" }));

    expect(push).toHaveBeenCalledWith("/");
    expect(back).not.toHaveBeenCalled();
  });
});
