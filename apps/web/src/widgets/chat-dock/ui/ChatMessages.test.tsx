import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatMessages from "./ChatMessages";
import type { ChatMessage } from "../model/types";

const sources = [
  { id: "a", title: "Docker - Volume", category: "DevOps", score: 0.62 },
  { id: "b", title: "Docker", category: "DevOps", score: 0.54 },
];

const user = (text: string, id = "u"): ChatMessage => ({ id, role: "user", text });
const assistant = (text: string, id = "a", withSources?: ChatMessage["sources"]): ChatMessage => ({
  id,
  role: "assistant",
  text,
  ...(withSources ? { sources: withSources } : {}),
});

// jsdom은 링크를 누르면 실제 페이지 이동을 시도하며 경고를 낸다 — 이동만 막는다(클릭 이벤트는 그대로 전달된다)
const blockNavigation = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", blockNavigation));
afterEach(() => document.removeEventListener("click", blockNavigation));

describe("ChatMessages 출처 카드", () => {
  it("출처가 있는 답변 아래에 참고한 글 카드를 보여준다", () => {
    render(<ChatMessages messages={[user("도커 볼륨이 뭐야?"), assistant("볼륨은 데이터를 보존합니다[1].", "a1", sources)]} />);
    expect(screen.getByText("볼륨은 데이터를 보존합니다[1].")).toBeInTheDocument();
    expect(screen.getByText("참고한 글")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/posts/a", "/posts/b"]);
  });

  it("출처가 없는 답변(일반 답변·기존 채팅)에는 카드를 그리지 않는다", () => {
    render(<ChatMessages messages={[user("질문"), assistant("일반 답변")]} />);
    expect(screen.getByText("일반 답변")).toBeInTheDocument();
    expect(screen.queryByText("참고한 글")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("출처가 빈 배열이어도 카드를 그리지 않는다", () => {
    render(<ChatMessages messages={[assistant("답", "a1", [])]} />);
    expect(screen.queryByText("참고한 글")).not.toBeInTheDocument();
  });

  it("사용자 메시지에는 카드를 붙이지 않는다", () => {
    render(<ChatMessages messages={[{ ...user("질문"), sources }]} />);
    expect(screen.queryByText("참고한 글")).not.toBeInTheDocument();
  });

  it("답변마다 자기 출처만 보여준다", () => {
    render(
      <ChatMessages
        messages={[
          user("첫 질문", "u1"),
          assistant("첫 답", "a1", [sources[0]]),
          user("두 번째 질문", "u2"),
          assistant("두 번째 답", "a2", [{ id: "c", title: "다른 글", category: "AI", score: 0.7 }]),
        ]}
      />,
    );
    expect(screen.getAllByText("참고한 글")).toHaveLength(2);
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/posts/a", "/posts/c"]);
  });

  it("카드를 누르면 onNavigate가 불린다 (모바일 채팅 시트를 닫는 데 쓴다)", async () => {
    const onNavigate = vi.fn();
    render(<ChatMessages messages={[assistant("답", "a1", sources)]} onNavigate={onNavigate} />);
    await userEvent.click(screen.getAllByRole("link")[1]);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("답변 본문은 그대로 마크다운으로 그려지고 복사 버튼도 유지된다", () => {
    render(<ChatMessages messages={[assistant("**굵게** 그리고 목록\n\n- 하나\n- 둘", "a1", sources)]} />);
    expect(screen.getByText("굵게").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /복사/ })).toBeInTheDocument();
  });
});

describe("ChatMessages 조회 중 표시", () => {
  it("마지막 답변이 아직 비어 있으면 '조회 중'을 보여주고 빈 말풍선·복사 버튼은 그리지 않는다", () => {
    render(<ChatMessages messages={[user("질문"), assistant("", "a1")]} />);
    expect(screen.getByRole("status")).toHaveTextContent("조회 중");
    expect(screen.queryByRole("button", { name: /복사/ })).not.toBeInTheDocument();
  });

  it("답변 글자가 오기 시작하면 '조회 중'이 사라지고 답변이 보인다", () => {
    const { rerender } = render(<ChatMessages messages={[user("질문"), assistant("", "a1")]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<ChatMessages messages={[user("질문"), assistant("안녕하세요", "a1")]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });

  it("마지막이 아닌 빈 답변(옛 대화)에는 표시하지 않는다", () => {
    render(<ChatMessages messages={[user("a", "u1"), assistant("", "a1"), user("b", "u2"), assistant("답", "a2")]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("마지막이 사용자 메시지면 표시하지 않는다", () => {
    render(<ChatMessages messages={[user("질문")]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ChatMessages 자동 스크롤", () => {
  // jsdom은 레이아웃이 없어 높이가 0이다 — 대화창(overflow-y-auto)의 크기를 정해 주고 scrollTop을 직접 다룬다
  const SCROLL_HEIGHT = 1000;
  const CLIENT_HEIGHT = 300;
  let scrollTops: WeakMap<HTMLElement, number>;

  beforeEach(() => {
    scrollTops = new WeakMap();
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(SCROLL_HEIGHT);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(CLIENT_HEIGHT);
    vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockImplementation(function (this: HTMLElement) {
      return scrollTops.get(this) ?? 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollTop", "set").mockImplementation(function (this: HTMLElement, v: number) {
      scrollTops.set(this, v);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const box = (container: HTMLElement) => container.querySelector<HTMLElement>(".overflow-y-auto")!;

  it("처음 열리면 맨 아래(최신)로 간다", () => {
    const { container } = render(<ChatMessages messages={[user("질문"), assistant("답")]} />);
    expect(box(container).scrollTop).toBe(SCROLL_HEIGHT);
  });

  it("답변이 이어서 채워질 때마다 맨 아래를 따라간다", () => {
    const { container, rerender } = render(<ChatMessages messages={[user("질문"), assistant("", "a1")]} />);
    scrollTops.set(box(container), 0);
    rerender(<ChatMessages messages={[user("질문"), assistant("긴 답변 일부", "a1")]} />);
    expect(box(container).scrollTop).toBe(SCROLL_HEIGHT);
  });

  it("사용자가 위로 올려 읽는 중이면 답변이 이어져도 끌어내리지 않는다", () => {
    const { container, rerender } = render(<ChatMessages messages={[user("질문"), assistant("앞부분", "a1")]} />);
    scrollTops.set(box(container), 100); // 바닥(700)에서 멀리 올라감
    fireEvent.scroll(box(container));
    rerender(<ChatMessages messages={[user("질문"), assistant("앞부분 + 더", "a1")]} />);
    expect(box(container).scrollTop).toBe(100);
  });

  it("올려서 읽다가 새 질문을 보내면 다시 맨 아래로 간다", () => {
    const { container, rerender } = render(<ChatMessages messages={[user("질문"), assistant("답", "a1")]} />);
    scrollTops.set(box(container), 100);
    fireEvent.scroll(box(container));
    rerender(<ChatMessages messages={[user("질문"), assistant("답", "a1"), user("새 질문", "u2"), assistant("", "a2")]} />);
    expect(box(container).scrollTop).toBe(SCROLL_HEIGHT);
  });

  it("바닥 근처로 돌아오면 다시 따라간다", () => {
    const { container, rerender } = render(<ChatMessages messages={[user("질문"), assistant("앞", "a1")]} />);
    scrollTops.set(box(container), 100);
    fireEvent.scroll(box(container));
    scrollTops.set(box(container), SCROLL_HEIGHT - CLIENT_HEIGHT - 20); // 바닥에서 20px
    fireEvent.scroll(box(container));
    rerender(<ChatMessages messages={[user("질문"), assistant("앞 + 뒤", "a1")]} />);
    expect(box(container).scrollTop).toBe(SCROLL_HEIGHT);
  });
});
