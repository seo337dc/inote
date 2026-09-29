import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostAiSummary from "./PostAiSummary";

describe("PostAiSummary", () => {
  it("요약 불릿을 보여준다", () => {
    render(<PostAiSummary summary={["첫째 줄", "둘째 줄"]} />);

    expect(screen.getByText("첫째 줄")).toBeInTheDocument();
    expect(screen.getByText("둘째 줄")).toBeInTheDocument();
  });

  it("hint가 있으면 펼쳐진 상태에서 안내 문구를 함께 보여주고, 접으면 숨긴다", async () => {
    const user = userEvent.setup();
    render(<PostAiSummary summary={["요약"]} hint="저장하면 다시 만들어져요." />);

    expect(screen.getByText("저장하면 다시 만들어져요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI 개요" }));

    expect(screen.queryByText("저장하면 다시 만들어져요.")).not.toBeInTheDocument();
    expect(screen.queryByText("요약")).not.toBeInTheDocument();
  });

  it("hint가 없으면 안내 문구를 그리지 않는다", () => {
    const { container } = render(<PostAiSummary summary={["요약"]} />);

    expect(container.querySelector("p")).toBeNull();
  });

  it("다시 요약 콜백이 없으면 설정 아이콘을 그리지 않는다", () => {
    render(<PostAiSummary summary={["요약"]} />);

    expect(screen.queryByRole("button", { name: "AI 개요 설정" })).not.toBeInTheDocument();
  });

  it("설정 아이콘을 누르면 메뉴가 열리고, 'AI 다시 요약하기'를 누르면 콜백이 불리고 메뉴가 닫힌다", async () => {
    const user = userEvent.setup();
    const onResummarize = vi.fn();
    render(<PostAiSummary summary={["요약"]} onResummarize={onResummarize} />);
    expect(screen.queryByRole("button", { name: "AI 다시 요약하기" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI 개요 설정" }));
    await user.click(screen.getByRole("button", { name: "AI 다시 요약하기" }));

    expect(onResummarize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "AI 다시 요약하기" })).not.toBeInTheDocument();
  });

  it("메뉴 바깥을 누르거나 Esc를 누르면 메뉴가 닫힌다", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <p>바깥</p>
        <PostAiSummary summary={["요약"]} onResummarize={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "AI 개요 설정" }));
    await user.click(screen.getByText("바깥"));
    expect(screen.queryByRole("button", { name: "AI 다시 요약하기" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI 개요 설정" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "AI 다시 요약하기" })).not.toBeInTheDocument();
  });

  it("요약 중이면 안내 문구를 보여주고, 요약이 비어 있으면 없다고 알려준다", () => {
    const { rerender } = render(
      <PostAiSummary summary={["이전 요약"]} onResummarize={vi.fn()} resummarizing />,
    );
    expect(screen.getByText("AI가 다시 요약하고 있어요…")).toBeInTheDocument();
    expect(screen.queryByText("이전 요약")).not.toBeInTheDocument();

    rerender(<PostAiSummary summary={[]} onResummarize={vi.fn()} />);
    expect(screen.getByText("아직 요약이 없어요.")).toBeInTheDocument();
  });
});
