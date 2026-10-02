import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PostList from "./PostList";
import { makePost } from "@/test/fixtures/posts";

describe("PostList — 비공개 표시", () => {
  it("비공개 글 행에만 '비공개'를 보여준다", () => {
    render(
      <PostList
        posts={[
          makePost("a", { title: "비공개 글", isPrivate: true }),
          makePost("b", { title: "공개 글", isPrivate: false }),
        ]}
      />,
    );

    const [privateRow, publicRow] = screen.getAllByRole("listitem");
    expect(within(privateRow).getByText("비공개")).toBeInTheDocument();
    expect(within(publicRow).queryByText("비공개")).not.toBeInTheDocument();
  });
});
