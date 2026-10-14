import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SourceCards from "./SourceCards";
import type { ChatSource } from "../model/types";

const source = (over: Partial<ChatSource> = {}): ChatSource => ({
  id: "post-1",
  title: "Docker - Volume",
  category: "학습 > DevOps",
  score: 0.62,
  ...over,
});

// jsdom은 링크를 누르면 실제 페이지 이동을 시도하며 경고를 낸다 — 이동만 막는다(클릭 이벤트는 그대로 전달된다)
const blockNavigation = (e: Event) => e.preventDefault();
beforeEach(() => document.addEventListener("click", blockNavigation));
afterEach(() => document.removeEventListener("click", blockNavigation));

describe("SourceCards", () => {
  it("출처가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<SourceCards sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("출처마다 번호·제목·카테고리와 글 링크를 보여준다", () => {
    render(
      <SourceCards
        sources={[source(), source({ id: "post-2", title: "Docker", category: "DevOps" })]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0]);
    expect(first.getByText("1")).toBeInTheDocument();
    expect(first.getByText("Docker - Volume")).toBeInTheDocument();
    expect(first.getByText("학습 > DevOps")).toBeInTheDocument();
    expect(first.getByRole("link")).toHaveAttribute("href", "/posts/post-1");

    const second = within(items[1]);
    expect(second.getByText("2")).toBeInTheDocument();
    expect(second.getByRole("link")).toHaveAttribute("href", "/posts/post-2");
  });

  it("답변의 [1][2]와 맞도록 서버가 준 순서 그대로 번호를 붙인다 (점수 순서를 다시 매기지 않는다)", () => {
    render(
      <SourceCards sources={[source({ id: "low", title: "낮은 점수", score: 0.5 }), source({ id: "high", title: "높은 점수", score: 0.9 })]} />,
    );
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/posts/low", "/posts/high"]);
  });

  it("점수는 화면에 보이지 않는다", () => {
    render(<SourceCards sources={[source({ score: 0.6234 })]} />);
    expect(screen.queryByText(/0\.62/)).not.toBeInTheDocument();
  });

  it("제목이 비어 있으면 '(제목 없음)'으로 보여준다", () => {
    render(<SourceCards sources={[source({ title: "   " })]} />);
    expect(screen.getByText("(제목 없음)")).toBeInTheDocument();
  });

  it("카테고리가 없으면 카테고리 줄을 그리지 않는다", () => {
    render(<SourceCards sources={[source({ category: "" })]} />);
    expect(screen.queryByText("학습 > DevOps")).not.toBeInTheDocument();
    const link = within(screen.getByRole("listitem")).getByRole("link");
    expect(link).toHaveTextContent(/^1Docker - Volume$/);
    // 글자가 없어도 빈 줄(요소)이 남지 않아야 한다 — 카드 높이가 어긋난다
    expect(link.querySelector(".truncate")).toBeNull();
  });

  it("글 id에 주소에 쓸 수 없는 문자가 있어도 안전하게 인코딩한다", () => {
    render(<SourceCards sources={[source({ id: "a/b?c#d" })]} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/posts/a%2Fb%3Fc%23d");
  });

  it("카드를 누르면 onNavigate가 불린다", async () => {
    const onNavigate = vi.fn();
    render(<SourceCards sources={[source()]} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("onNavigate가 없어도 눌러서 오류가 나지 않는다", async () => {
    render(<SourceCards sources={[source()]} />);
    await userEvent.click(screen.getByRole("link"));
  });
});
