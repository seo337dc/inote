import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: () => ({ data: null }) }));

import ChatEmptyState from "./ChatEmptyState";
import { askSuggestion } from "../model/suggestions";

describe("ChatEmptyState 시작 버튼", () => {
  it("label을 버튼 글자로 보여주고, 누르면 그 항목 전체(label·action)를 넘긴다", async () => {
    const onSelect = vi.fn();
    const suggestions = [askSuggestion("글을 찾아줘", "내 글 중에서 찾아줘"), askSuggestion("과제 도와줘")];
    render(<ChatEmptyState suggestions={suggestions} onSelect={onSelect} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["글을 찾아줘", "과제 도와줘"]);
    await userEvent.click(screen.getByRole("button", { name: "글을 찾아줘" }));
    expect(onSelect).toHaveBeenCalledWith({ label: "글을 찾아줘", action: { type: "ask", text: "내 글 중에서 찾아줘" } });
  });
});

describe("askSuggestion", () => {
  it("text를 생략하면 label을 그대로 질문으로 보낸다", () => {
    expect(askSuggestion("책 추천해줘")).toEqual({ label: "책 추천해줘", action: { type: "ask", text: "책 추천해줘" } });
  });
});
