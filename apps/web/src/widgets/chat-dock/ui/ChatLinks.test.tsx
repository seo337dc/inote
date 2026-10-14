import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatLinks from "./ChatLinks";
import ChatMessages from "./ChatMessages";

const blockNavigation = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", blockNavigation));
afterEach(() => document.removeEventListener("click", blockNavigation));

const links = [
  { href: "/write/d1", label: "도커 정리", hint: "DevOps · 작성 중" },
  { href: "/write", label: "새 글 쓰기" },
];

describe("ChatLinks", () => {
  it("링크마다 글자·부가 설명·주소를 보여준다", () => {
    render(<ChatLinks links={links} />);
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/write/d1", "/write"]);
    expect(screen.getByText("DevOps · 작성 중")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /새 글 쓰기/ })).toBeInTheDocument();
  });

  it("누르면 onNavigate가 불린다 (모바일 시트를 닫는 데 쓴다)", async () => {
    const onNavigate = vi.fn();
    render(<ChatLinks links={links} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: /도커 정리/ }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("링크가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<ChatLinks links={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChatMessages의 안내 링크", () => {
  it("links가 있는 답변 아래에만 붙는다", () => {
    render(
      <ChatMessages
        messages={[
          { id: "u", role: "user", text: "글을 쓰고 싶어", local: true },
          { id: "a", role: "assistant", text: "작성 중인 글이 1개 있어요.", links, local: true },
          { id: "a2", role: "assistant", text: "링크 없는 답" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
