import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";
import { DEFAULT_TABLE } from "./table-commands";

type Ed = {
  getHTML: () => string;
  state: { doc: { descendants: (f: (n: { isText: boolean; text?: string }, p: number) => boolean | void) => void } };
  commands: { setTextSelection: (p: number) => void; focus: () => void };
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
  const onChange = vi.fn();
  const { container } = render(<PostEditor content={initial} onChange={onChange} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));
  const cursorIn = (text: string) => {
    let found = -1;
    el.editor.state.doc.descendants((node, pos) => {
      if (found < 0 && node.isText && node.text === text) found = pos + 1;
    });
    act(() => {
      el.editor.commands.setTextSelection(found);
      el.editor.commands.focus();
    });
  };
  const button = () => screen.getByRole("button", { name: "표" }) as HTMLButtonElement;
  return { user, el, onChange, cursorIn, button };
}

describe("툴바의 '표' 버튼", () => {
  it("누르면 기본 크기(3×3, 첫 행은 제목 칸)의 표가 커서 자리에 삽입된다", async () => {
    const { user, el, cursorIn, button } = await setup("<p>앞 문단</p>");
    cursorIn("앞 문단");

    await user.click(button());

    const rows = [...el.querySelectorAll("tr")];
    expect(rows).toHaveLength(DEFAULT_TABLE.rows);
    expect(rows[0].children).toHaveLength(DEFAULT_TABLE.cols);
    expect([...rows[0].children].every((c) => c.tagName === "TH")).toBe(true);
    expect([...rows[1].children].every((c) => c.tagName === "TD")).toBe(true);
    expect(el.textContent).toContain("앞 문단");
  });

  it("삽입하면 커서가 새 표 안에 놓여 표 편집 툴바가 바로 뜬다", async () => {
    const { user, cursorIn, button } = await setup("<p>앞 문단</p>");
    cursorIn("앞 문단");

    await user.click(button());

    expect(await screen.findByRole("toolbar", { name: "표 편집" })).toBeInTheDocument();
  });

  it("삽입한 내용이 onChange로 나간다", async () => {
    const { user, onChange, cursorIn, button } = await setup("<p>앞 문단</p>");
    cursorIn("앞 문단");
    onChange.mockClear();

    await user.click(button());

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0]).toContain("<table");
  });

  it("표 안에 커서가 있으면 비활성이라 표 안에 표가 중첩되지 않는다", async () => {
    const { user, el, cursorIn, button } = await setup(
      "<table><tbody><tr><th><p>H1</p></th></tr><tr><td><p>a1</p></td></tr></tbody></table><p>표 밖</p>",
    );
    cursorIn("a1");

    await waitFor(() => expect(button()).toBeDisabled());
    await user.click(button());

    expect(el.querySelectorAll("table")).toHaveLength(1);
  });

  it("표 안에서 표 밖으로 커서를 옮기면 다시 활성이 된다", async () => {
    const { cursorIn, button } = await setup(
      "<table><tbody><tr><th><p>H1</p></th></tr><tr><td><p>a1</p></td></tr></tbody></table><p>표 밖</p>",
    );
    cursorIn("a1");
    await waitFor(() => expect(button()).toBeDisabled());

    cursorIn("표 밖");

    await waitFor(() => expect(button()).toBeEnabled());
  });

  it("굵은 글씨가 든 칸에서도 비활성이다 (서식이 겹쳐도 표 판정은 틀어지지 않는다)", async () => {
    const { cursorIn, button } = await setup(
      "<table><tbody><tr><th><p>H1</p></th></tr><tr><td><p><strong>굵게</strong></p></td></tr></tbody></table>",
    );

    cursorIn("굵게");

    await waitFor(() => expect(button()).toBeDisabled());
  });

  it("표가 없는 글에서는 처음부터 활성이다", async () => {
    const { button } = await setup("<p>그냥 문단</p>");

    expect(button()).toBeEnabled();
  });
});
