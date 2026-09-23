import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import UsageBadge from "./UsageBadge";

describe("UsageBadge", () => {
  it("used가 true면 '사용'을 초록색으로 보여준다", () => {
    render(<UsageBadge used={true} />);
    const badge = screen.getByText("사용");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-50", "text-green-700");
  });

  it("used가 false면 '미사용'을 빨간색으로 보여준다", () => {
    render(<UsageBadge used={false} />);
    const badge = screen.getByText("미사용");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-red-50", "text-red-600");
  });
});
