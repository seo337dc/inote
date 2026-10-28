import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoadError from "./LoadError";

describe("LoadError", () => {
  it("기본 안내 문구를 alert로 보여준다", () => {
    render(<LoadError onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  });

  it("message를 넘기면 그 문구를 보여준다", () => {
    render(<LoadError onRetry={vi.fn()} message="글을 불러오지 못했어요." />);

    expect(screen.getByRole("alert")).toHaveTextContent("글을 불러오지 못했어요.");
  });

  it("[다시 시도]를 누르면 onRetry가 한 번 불린다", async () => {
    const onRetry = vi.fn();
    render(<LoadError onRetry={onRetry} />);

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
