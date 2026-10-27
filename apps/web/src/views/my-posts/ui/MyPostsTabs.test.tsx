import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MyPostsTabs from "./MyPostsTabs";

describe("MyPostsTabs", () => {
  it("나의 글과 보관함으로 가는 링크 두 개가 있다", () => {
    render(<MyPostsTabs archived={false} />);

    expect(screen.getByRole("link", { name: "나의 글" })).toHaveAttribute("href", "/my-posts");
    expect(screen.getByRole("link", { name: "보관함" })).toHaveAttribute("href", "/my-posts/archive");
  });

  it("지금 보는 쪽에만 aria-current가 붙는다 (나의 글)", () => {
    render(<MyPostsTabs archived={false} />);

    expect(screen.getByRole("link", { name: "나의 글" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "보관함" })).not.toHaveAttribute("aria-current");
  });

  it("지금 보는 쪽에만 aria-current가 붙는다 (보관함)", () => {
    render(<MyPostsTabs archived />);

    expect(screen.getByRole("link", { name: "보관함" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "나의 글" })).not.toHaveAttribute("aria-current");
  });
});
