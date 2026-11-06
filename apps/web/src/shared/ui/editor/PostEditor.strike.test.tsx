import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";
import { selectText, type EditorElement } from "@/test/editor";


async function setup(initial: string) {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content={initial} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as EditorElement;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  const select = (text: string) => selectText(el, text);
  const pressed = () => screen.getByRole("button", { name: "취소선" }).getAttribute("aria-pressed") === "true";
  const click = () => user.click(screen.getByRole("button", { name: "취소선" }));
  return { el, select, pressed, click };
}

describe("취소선 버튼", () => {
  it("선택한 글자만 취소선이 되고, 다시 누르면 풀린다", async () => {
    const { el, select, click } = await setup("<p>이 일은 끝났다</p>");
    select("끝났다");

    await click();
    expect(el.editor.getHTML()).toBe("<p>이 일은 <s>끝났다</s></p>");

    select("끝났다");
    await click();
    expect(el.editor.getHTML()).toBe("<p>이 일은 끝났다</p>");
  });

  it("취소선 글자 위에 커서가 있으면 버튼이 눌린 상태로 보인다", async () => {
    const { select, pressed } = await setup("<p>이 일은 <s>끝났다</s></p>");
    select("끝났다");

    await waitFor(() => expect(pressed()).toBe(true));
  });

  it("저장된 <s>·<del>·<strike> 글은 모두 취소선으로 불러온다", async () => {
    const { el } = await setup("<p><s>가</s> <del>나</del> <strike>다</strike></p>");

    expect(el.editor.getHTML()).toBe("<p><s>가</s> <s>나</s> <s>다</s></p>");
  });
});
