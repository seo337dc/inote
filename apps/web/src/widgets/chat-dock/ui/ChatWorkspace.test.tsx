import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";

let mockPathname = "/write";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// 일반 모드 훅은 useRef로 시작하고 독서·글 찾기 모드 훅은 useState로 시작해서(실제 훅도 그렇다),
// 라우트에 따라 훅을 갈아끼우는 구조면 훅 순서가 달라져 React가 에러를 낸다.
// 글 찾기 훅은 useState 뒤에 useRef도 쓴다(실제 훅도 그렇다) — 훅 개수가 달라도 항상 같은 순서로 부르는지 보려는 것.
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
vi.mock("../model/usePostsChatMessages", async () => {
  const { useState, useRef } = await import("react");
  return {
    usePostsChatMessages: () => {
      useState(0);
      useRef(0);
      return { mode: "posts" };
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

  it("라우트가 독서 ↔ 일반 ↔ 글 찾기로 바뀌어도 훅 순서 에러 없이 해당 모드를 보여준다", () => {
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
    expect(getByTestId("panel")).toHaveTextContent("posts");

    mockPathname = "/write";
    rerender(
      <ChatWorkspace nav={null}>
        <p>본문</p>
      </ChatWorkspace>,
    );
    expect(getByTestId("panel")).toHaveTextContent("default");

    expect(errorSpy).not.toHaveBeenCalled();
  });

  describe("화면별 채팅 모드", () => {
    const modeAt = (pathname: string) => {
      mockPathname = pathname;
      const { getByTestId, unmount } = render(
        <ChatWorkspace nav={null}>
          <p>본문</p>
        </ChatWorkspace>,
      );
      const mode = getByTestId("panel").textContent;
      unmount();
      return mode;
    };

    it("글 목록(홈 /)만 글 찾기 모드다", () => {
      expect(modeAt("/")).toBe("posts");
    });

    it("독서 화면은 독서 모드다", () => {
      for (const path of ["/reading", "/reading/write", "/reading/abc"]) expect(modeAt(path), path).toBe("reading");
    });

    it("그 밖의 화면은 기존 일반(글쓰기) 모드를 유지한다 — 비공개 글이 섞일 수 있는 화면 포함", () => {
      for (const path of ["/write", "/write/abc", "/posts/abc", "/my-posts", "/users/abc", "/categories", "/todos", "/profile", "/dashboard"]) {
        expect(modeAt(path), path).toBe("default");
      }
    });

    it("홈과 비슷한 주소(/posts, /home)나 하위 경로는 글 찾기가 아니다", () => {
      for (const path of ["/posts", "/home", "/index", "//"]) expect(modeAt(path), path).toBe("default");
    });
  });
});
