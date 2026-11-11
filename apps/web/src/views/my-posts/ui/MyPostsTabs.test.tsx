import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MyPostsTabs from "./MyPostsTabs";

describe("MyPostsTabs", () => {
  it("나의 글·임시저장·보관함으로 가는 링크 세 개가 이 순서로 있다", () => {
    render(<MyPostsTabs current="posts" />);

    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["나의 글", "임시저장", "보관함"]);
    expect(screen.getByRole("link", { name: "나의 글" })).toHaveAttribute("href", "/my-posts");
    expect(screen.getByRole("link", { name: "임시저장" })).toHaveAttribute("href", "/my-posts/drafts");
    expect(screen.getByRole("link", { name: "보관함" })).toHaveAttribute("href", "/my-posts/archive");
  });

  it.each([
    ["posts", "나의 글"],
    ["drafts", "임시저장"],
    ["archive", "보관함"],
  ] as const)("지금 보는 쪽(%s)에만 aria-current가 붙는다", (current, label) => {
    render(<MyPostsTabs current={current} />);

    const links = screen.getAllByRole("link");
    expect(links.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)).toEqual([label]);
  });
});
