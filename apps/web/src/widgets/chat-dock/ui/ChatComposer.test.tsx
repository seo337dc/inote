import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatComposer from "./ChatComposer";
import type { useChatMessages } from "../model/useChatMessages";

type Chat = ReturnType<typeof useChatMessages>;

function makeChat(overrides: Partial<Chat>): Chat {
  return {
    input: "질문",
    setInput: vi.fn(),
    handleSend: vi.fn(),
    isSending: false,
    isLoggedIn: false,
    toggleSessionPanel: vi.fn(),
    ...overrides,
  } as unknown as Chat;
}

describe("ChatComposer", () => {
  it("전송 중에는 보내기 버튼이 비활성화된다", () => {
    render(<ChatComposer chat={makeChat({ isSending: true })} />);

    expect(screen.getByRole("button", { name: "보내기" })).toBeDisabled();
  });

  it("전송 중에 Enter를 눌러도 전송되지 않는다", async () => {
    const chat = makeChat({ isSending: true });
    render(<ChatComposer chat={chat} />);

    await userEvent.type(screen.getByRole("textbox"), "{Enter}");

    expect(chat.handleSend).not.toHaveBeenCalled();
  });

  it("전송 중이 아니고 입력이 있으면 Enter로 전송된다", async () => {
    const chat = makeChat({ isSending: false });
    render(<ChatComposer chat={chat} />);

    await userEvent.type(screen.getByRole("textbox"), "{Enter}");

    expect(chat.handleSend).toHaveBeenCalledTimes(1);
  });
});
