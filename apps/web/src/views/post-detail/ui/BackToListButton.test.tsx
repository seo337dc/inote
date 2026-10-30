import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BackToListButton from "./BackToListButton";

describe("BackToListButton", () => {
  it("'← 목록으로' 링크로 보이고 나의 글 목록(/my-posts)으로 가는 주소를 가진다", () => {
    render(<BackToListButton />);

    expect(screen.getByRole("link", { name: "← 목록으로" })).toHaveAttribute("href", "/my-posts");
  });
});
