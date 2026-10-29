import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatSessionPanel from "./ChatSessionPanel";
import type { ChatSession } from "../model/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const session = (id: string, over: Partial<ChatSession> = {}): ChatSession => ({
  id,
  post_id: null,
  post_title: null,
  post_category: null,
  updated_at: "",
  last_message: `${id} 대화 내용`,
  ...over,
});

function renderPanel(sessions: ChatSession[], answering: string[]) {
  const chat = {
    sessions,
    activeSessionId: null,
    answeringSessionIds: new Set(answering),
    sessionSearch: "",
    setSessionSearch: vi.fn(),
    toggleSessionPanel: vi.fn(),
    startNewSession: vi.fn(),
    selectSession: vi.fn(),
  };
  return render(<ChatSessionPanel chat={chat as unknown as Parameters<typeof ChatSessionPanel>[0]["chat"]} />);
}

describe("ChatSessionPanel — 답변 중 표시", () => {
  it("답변이 진행 중인 대화의 행에만 '답변 중' 표시가 붙는다", () => {
    // 지켜주는 것: 다른 대화에 있는 동안 어느 대화가 답변 중인지 목록에서 알 수 없던 문제
    renderPanel([session("a"), session("b"), session("c")], ["b"]);

    const marks = screen.getAllByRole("img", { name: "답변 중" });
    expect(marks).toHaveLength(1);
    expect(marks[0].closest("li")).toHaveTextContent("b 대화 내용");
  });

  it("표시는 맨 위 카테고리 텍스트와 같은 줄에 있다", () => {
    // 지켜주는 것: 점이 제목이 아니라 '일반 대화'·'글쓰기 · 카테고리' 줄 옆에 붙는 위치
    renderPanel(
      [session("a", { post_id: "p1", post_title: "ACID", post_category: "학습" })],
      ["a"],
    );

    const mark = screen.getByRole("img", { name: "답변 중" });
    expect(mark.parentElement).toHaveTextContent("글쓰기 · 학습");
    expect(mark.parentElement).not.toHaveTextContent("ACID");
  });

  it("답변 중인 대화가 없으면 표시가 없다", () => {
    // 지켜주는 것: 답이 끝난 뒤 점이 남아 있는 문제
    renderPanel([session("a"), session("b")], []);

    expect(screen.queryByRole("img", { name: "답변 중" })).toBeNull();
  });
});
