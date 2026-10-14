import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";

type Ed = {
  getHTML: () => string;
  state: { doc: { descendants: (f: (n: { isText: boolean; text?: string }, p: number) => boolean | void) => void } };
  commands: { setTextSelection: (p: number | { from: number; to: number }) => void };
};
type El = HTMLElement & { editor: Ed };

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
});

async function setup(initial: string) {
  const user = userEvent.setup();
  const { container } = render(<PostEditor content={initial} onChange={vi.fn()} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  // 글자 text의 [from, to) 문서 위치를 찾아 선택
  const select = (text: string) => {
    let start = -1;
    el.editor.state.doc.descendants((node, pos) => {
      const i = node.isText ? (node.text?.indexOf(text) ?? -1) : -1;
      if (start < 0 && i >= 0) start = pos + i;
    });
    act(() => el.editor.commands.setTextSelection({ from: start, to: start + text.length }));
  };
  const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed") === "true";
  const click = async (name: string) => user.click(await screen.findByRole("button", { name }));
  return { el, select, pressed, click };
}

describe("선택 영역 서식 메뉴 (버블 메뉴)", () => {
  it("선택한 글자를 굵게·기울임·인라인 코드로 바꾸고, 다시 누르면 풀린다", async () => {
    const { el, select, click } = await setup("<p>하나 둘 셋</p>");

    select("둘");
    await click("선택 영역 굵게");
    expect(el.editor.getHTML()).toBe("<p>하나 <strong>둘</strong> 셋</p>");
    select("둘");
    await click("선택 영역 굵게");
    expect(el.editor.getHTML()).toBe("<p>하나 둘 셋</p>");

    select("둘");
    await click("선택 영역 기울임");
    expect(el.editor.getHTML()).toBe("<p>하나 <em>둘</em> 셋</p>");

    select("셋");
    await click("선택 영역 인라인 코드");
    expect(el.editor.getHTML()).toContain("<code>셋</code>");
  });

  it("선택한 글자를 취소선으로 바꾸고, 다시 누르면 풀린다", async () => {
    const { el, select, click } = await setup("<p>하나 둘 셋</p>");

    select("둘");
    await click("선택 영역 취소선");
    expect(el.editor.getHTML()).toBe("<p>하나 <s>둘</s> 셋</p>");
    select("둘");
    await click("선택 영역 취소선");
    expect(el.editor.getHTML()).toBe("<p>하나 둘 셋</p>");
  });

  it("현재 서식이 켜진 글자를 선택하면 해당 버튼이 눌린 상태로 보인다", async () => {
    const { select, pressed } = await setup("<p>하나 <strong>둘</strong> 셋</p>");

    select("둘");
    await waitFor(() => expect(pressed("선택 영역 굵게")).toBe(true));
    expect(pressed("선택 영역 기울임")).toBe(false);
  });

  it("링크 버튼은 툴바의 링크 버튼과 같은 주소 입력 팝업을 연다", async () => {
    const { select, click } = await setup("<p>하나 둘 셋</p>");
    select("둘");

    await click("선택 영역 링크");

    expect(screen.getByRole("textbox", { name: "링크 주소" })).toBeInTheDocument();
  });

  it("글자를 선택하지 않으면 메뉴가 보이지 않는다", async () => {
    await setup("<p>본문</p>");

    expect(screen.queryByRole("button", { name: "선택 영역 굵게" })).not.toBeInTheDocument();
  });

  it("툴바 버튼과 이름이 겹치지 않는다 (선택해서 둘 다 보여도 구분된다)", async () => {
    const { select } = await setup("<p>본문</p>");
    select("본문");

    expect(await screen.findByRole("button", { name: "선택 영역 인라인 코드" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "인라인 코드" })).toHaveLength(1);
  });
});
