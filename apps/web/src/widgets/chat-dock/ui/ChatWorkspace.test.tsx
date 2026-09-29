import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";

let mockPathname = "/write";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// 일반 모드 훅은 useRef로 시작하고 독서 모드 훅은 useState로 시작해서(실제 훅도 그렇다),
// 라우트에 따라 훅을 갈아끼우는 구조면 훅 순서가 달라져 React가 에러를 낸다.
vi.mock("../model/useChatMessages", () => ({
  useChatMessages: () => {
    useRef(0);
    return { mode: "default" };
  },
}));
vi.mock("../model/useReadingChatMessages", async () => {
  const { useState } = await import("react");
  return {
    useReadingChatMessages: () => {
      useState(0);
      return { mode: "reading" };
    },
  };
});
vi.mock("./DesktopChatPanel", () => ({
  default: ({ chat }: { chat: { mode: string } }) => <div data-testid="panel">{chat.mode}</div>,
}));
vi.mock("./ChatDock", () => ({ default: () => null }));

import ChatWorkspace from "./ChatWorkspace";

describe("ChatWorkspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("라우트가 독서 ↔ 일반으로 바뀌어도 훅 순서 에러 없이 해당 모드를 보여준다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    mockPathname = "/write";
    const { rerender, getByTestId } = render(
      <ChatWorkspace nav={null}>
        <p>본문</p>
      </ChatWorkspace>,
    );
    expect(getByTestId("panel")).toHaveTextContent("default");

    mockPathname = "/reading/write";
    rerender(
      <ChatWorkspace nav={null}>
        <p>본문</p>
      </ChatWorkspace>,
    );
    expect(getByTestId("panel")).toHaveTextContent("reading");

    mockPathname = "/";
    rerender(
      <ChatWorkspace nav={null}>
        <p>본문</p>
      </ChatWorkspace>,
    );
    expect(getByTestId("panel")).toHaveTextContent("default");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
