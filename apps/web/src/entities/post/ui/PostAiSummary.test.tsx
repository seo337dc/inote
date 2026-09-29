import { describe, expect, it } from "vitest";
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

    await user.click(screen.getByRole("button", { name: /AI 개요/ }));

    expect(screen.queryByText("저장하면 다시 만들어져요.")).not.toBeInTheDocument();
    expect(screen.queryByText("요약")).not.toBeInTheDocument();
  });

  it("hint가 없으면 안내 문구를 그리지 않는다", () => {
    const { container } = render(<PostAiSummary summary={["요약"]} />);

    expect(container.querySelector("p")).toBeNull();
  });
});
