import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 이 시험은 "카드를 누르면 모바일 시트가 닫힌다"만 본다 — 입력창·세션 패널은 가짜로 대체
vi.mock("./ChatComposer", () => ({ default: () => null }));
vi.mock("./ChatSessionPanel", () => ({ default: () => null }));

import ChatPanel from "./ChatPanel";

const chat = {
  messages: [
    { id: "u", role: "user", text: "도커 볼륨이 뭐야?" },
    {
      id: "a",
      role: "assistant",
      text: "볼륨은 데이터를 보존합니다[1].",
      sources: [{ id: "post-1", title: "Docker - Volume", category: "DevOps", score: 0.62 }],
    },
  ],
  activeSessionTitle: "도커 볼륨이 뭐야?",
  isSessionPanelOpen: false,
  suggestions: [],
  sendPreset: () => {},
  selectSuggestion: () => {},
} as never;

// jsdom은 링크를 누르면 실제 페이지 이동을 시도하며 경고를 낸다 — 이동만 막는다(클릭 이벤트는 그대로 전달된다)
const blockNavigation = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", blockNavigation));
afterEach(() => document.removeEventListener("click", blockNavigation));

describe("ChatPanel(모바일 시트)", () => {
  it("출처 카드를 누르면 시트를 닫는다 (이동한 글을 가리지 않도록)", async () => {
    const onClose = vi.fn();
    render(<ChatPanel open onClose={onClose} chat={chat} />);
    await userEvent.click(screen.getByRole("link", { name: /Docker - Volume/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("카드가 가리키는 글 주소로 이동한다", () => {
    render(<ChatPanel open onClose={() => {}} chat={chat} />);
    expect(screen.getByRole("link", { name: /Docker - Volume/ })).toHaveAttribute("href", "/posts/post-1");
  });

  it("카드를 누르는 것과 상관없이 닫기 버튼도 시트를 닫는다", async () => {
    const onClose = vi.fn();
    render(<ChatPanel open onClose={onClose} chat={chat} />);
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
