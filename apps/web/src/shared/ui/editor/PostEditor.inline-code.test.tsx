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
  const pressed = (name: string) =>
    screen.getByRole("button", { name }).getAttribute("aria-pressed") === "true";
  const click = (name: string) => user.click(screen.getByRole("button", { name }));
  return { el, select, pressed, click };
}

describe("인라인 코드 버튼", () => {
  it("선택한 글자만 인라인 코드가 되고, 다시 누르면 풀린다", async () => {
    const { el, select, click } = await setup("<p>파일 login.spec.ts 를 본다</p>");
    select("login.spec.ts");

    await click("인라인 코드");
    expect(el.editor.getHTML()).toBe("<p>파일 <code>login.spec.ts</code> 를 본다</p>");

    select("login.spec.ts");
    await click("인라인 코드");
    expect(el.editor.getHTML()).toBe("<p>파일 login.spec.ts 를 본다</p>");
  });

  it("코드 블록 버튼과는 별개다 — 인라인 코드는 문단을 pre로 바꾸지 않는다", async () => {
    const { el, select, click } = await setup("<p>함수 foo 호출</p>");
    select("foo");

    await click("인라인 코드");

    expect(el.querySelector("pre")).toBeNull();
    expect(el.querySelector("p > code")).not.toBeNull();
  });

  it("커서가 인라인 코드 위에 있으면 인라인 코드 버튼만 켜진다", async () => {
    const { select, pressed } = await setup("<p>앞 <code>config.ts</code> 뒤</p>");

    select("config");

    expect(pressed("인라인 코드")).toBe(true);
    expect(pressed("코드 블록")).toBe(false);
  });

  it("코드 블록 안에서는 코드 블록 버튼만 켜지고 인라인 코드는 꺼져 있다", async () => {
    const { select, pressed } = await setup("<pre><code>const a = 1;</code></pre>");

    select("const");

    expect(pressed("코드 블록")).toBe(true);
    expect(pressed("인라인 코드")).toBe(false);
  });
});
