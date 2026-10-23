import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import ChatMessages from "./ChatMessages";
import type { ChatMessage } from "../model/types";

// jsdom은 레이아웃을 계산하지 않아서 높이를 직접 정해준다. 실제 스크롤 느낌은 브라우저에서 확인해야 한다.
const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;

const base: ChatMessage[] = [
  { id: "u1", role: "user", text: "질문" },
  { id: "a1", role: "assistant", text: "답" },
];

function scrollContainer(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

// 사용자가 스크롤한 것처럼 scrollTop을 정하고 scroll 이벤트를 낸다
function userScrollsTo(el: HTMLElement, top: number) {
  Object.defineProperty(el, "scrollTop", { value: top, configurable: true });
  fireEvent.scroll(el);
}

describe("ChatMessages 자동 스크롤", () => {
  const scrollTo = vi.fn();
  const original = Element.prototype.scrollTo;

  beforeEach(() => {
    scrollTo.mockClear();
    Element.prototype.scrollTo = scrollTo;
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(SCROLL_HEIGHT);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(CLIENT_HEIGHT);
  });

  afterEach(() => {
    Element.prototype.scrollTo = original;
    vi.restoreAllMocks();
  });

  it("대화가 열리면 맨 아래로 내려간다", () => {
    render(<ChatMessages messages={base} />);

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT });
  });

  it("아래를 보고 있으면 답변이 덧붙을 때 따라 내려간다", () => {
    const { rerender } = render(<ChatMessages messages={base} isSending />);
    scrollTo.mockClear();

    rerender(
      <ChatMessages messages={[base[0], { ...base[1], text: "답 이어서" }]} isSending />,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT });
  });

  it("위로 올려서 읽는 중이면 답변이 덧붙어도 끌어내리지 않는다", () => {
    const { container, rerender } = render(<ChatMessages messages={base} isSending />);
    userScrollsTo(scrollContainer(container), 100);
    scrollTo.mockClear();

    rerender(
      <ChatMessages messages={[base[0], { ...base[1], text: "답 이어서" }]} isSending />,
    );

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("위로 올려 둔 상태에서도 새 질문을 보내면 맨 아래로 내려간다", () => {
    const { container, rerender } = render(<ChatMessages messages={base} />);
    userScrollsTo(scrollContainer(container), 100);
    scrollTo.mockClear();

    rerender(<ChatMessages messages={base} isSending />);

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT });
  });

  it("다시 맨 아래 근처로 내려오면 따라가기를 재개한다", () => {
    const { container, rerender } = render(<ChatMessages messages={base} isSending />);
    userScrollsTo(scrollContainer(container), 100);
    userScrollsTo(scrollContainer(container), SCROLL_HEIGHT - CLIENT_HEIGHT - 10);
    scrollTo.mockClear();

    rerender(
      <ChatMessages messages={[base[0], { ...base[1], text: "답 이어서" }]} isSending />,
    );

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT });
  });

  it("다른 대화로 바뀌면(첫 메시지가 달라지면) 위로 올려 둔 상태여도 맨 아래로 간다", () => {
    const { container, rerender } = render(<ChatMessages messages={base} />);
    userScrollsTo(scrollContainer(container), 100);
    scrollTo.mockClear();

    rerender(<ChatMessages messages={[{ id: "u9", role: "user", text: "다른 대화" }, base[1]]} />);

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT });
  });
});
