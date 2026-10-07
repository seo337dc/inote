import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostEditor from "./PostEditor";
import { CALLOUT_EMOJIS } from "./CalloutView";

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
  Element.prototype.scrollIntoView = vi.fn();
  // 클릭하면 ProseMirror가 좌표로 위치를 찾으려고 elementFromPoint를 부르는데 jsdom에는 없다
  document.elementFromPoint = () => null;
});

const CALLOUT_HTML = '<div data-type="callout" data-emoji="💡"><p>강조 내용</p></div><p>뒤 문단</p>';

async function setup(initial: string, { empty = false }: { empty?: boolean } = {}) {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const { container } = render(<PostEditor content={initial} onChange={onChange} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  // 내용이 있는 글은 불러온 내용이 그려질 때까지 기다린다 (빈 글로 시작하면 기다릴 것이 없다)
  if (!empty) await waitFor(() => expect(el.textContent).not.toBe(""));
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
  const html = () => el.editor.getHTML();
  const toolbarButton = () => screen.getByRole("button", { name: "콜아웃" }) as HTMLButtonElement;
  return { user, el, container, onChange, cursorIn, html, toolbarButton };
}

describe("툴바의 '콜아웃' 버튼", () => {
  it("문단에 커서를 두고 누르면 그 문단이 콜아웃(기본 아이콘 💡)으로 감싸진다", async () => {
    const { user, cursorIn, html, toolbarButton } = await setup("<p>강조할 내용</p><p>뒤 문단</p>");
    cursorIn("강조할 내용");

    await user.click(toolbarButton());

    expect(html()).toBe('<div data-emoji="💡" data-type="callout"><p>강조할 내용</p></div><p>뒤 문단</p>');
  });

  it("콜아웃 안에 있으면 눌린 상태로 보이고, 다시 누르면 박스만 벗겨진다", async () => {
    const { user, cursorIn, html, toolbarButton } = await setup(CALLOUT_HTML);
    cursorIn("강조 내용");

    await waitFor(() => expect(toolbarButton()).toHaveAttribute("aria-pressed", "true"));
    await user.click(toolbarButton());

    expect(html()).toBe("<p>강조 내용</p><p>뒤 문단</p>");
    await waitFor(() => expect(toolbarButton()).toHaveAttribute("aria-pressed", "false"));
  });

  it("콜아웃 밖에서는 눌리지 않은 상태다", async () => {
    const { cursorIn, toolbarButton } = await setup(CALLOUT_HTML);
    cursorIn("뒤 문단");

    await waitFor(() => expect(toolbarButton()).toHaveAttribute("aria-pressed", "false"));
  });

  it("콜아웃 안의 제목처럼 다른 서식이 겹친 곳에서도 눌린 상태가 유지된다", async () => {
    const { cursorIn, toolbarButton } = await setup(
      '<div data-type="callout"><h2>박스 안 제목</h2></div><p>뒤 문단</p>',
    );
    cursorIn("박스 안 제목");

    await waitFor(() => expect(toolbarButton()).toHaveAttribute("aria-pressed", "true"));
  });

  it("변경 내용이 onChange로 나간다", async () => {
    const { user, cursorIn, onChange, toolbarButton } = await setup("<p>강조할 내용</p><p>뒤 문단</p>");
    cursorIn("강조할 내용");
    onChange.mockClear();

    await user.click(toolbarButton());

    expect(onChange.mock.calls.at(-1)![0]).toContain('data-type="callout"');
  });
});

describe("슬래시 메뉴로 콜아웃 삽입", () => {
  async function typeSlash(query: string) {
    const ctx = await setup("<p></p>", { empty: true });
    await ctx.user.click(ctx.el);
    await ctx.user.keyboard(`/${query}`);
    return ctx;
  }

  it("/callout을 입력하고 Enter를 누르면 빈 콜아웃이 삽입된다", async () => {
    const { user, html } = await typeSlash("callout");

    await user.keyboard("{Enter}");

    expect(html()).toContain('<div data-emoji="💡" data-type="callout">');
    expect(html()).not.toContain("/callout"); // 입력한 검색어는 지워진다
  });

  it("한글로 /콜아웃을 검색해도 찾는다", async () => {
    await typeSlash("콜아웃");

    const list = (await screen.findByText("아이콘이 있는 강조 박스")).closest("button")!.parentElement as HTMLElement;
    expect(within(list).getAllByRole("button")).toHaveLength(1);
  });

  it("이미 콜아웃 안에서 삽입하면 중첩하지 않고 입력한 검색어만 지운다", async () => {
    const ctx = await setup('<div data-type="callout"><p></p></div><p>뒤 문단</p>');
    await ctx.user.click(ctx.el);
    // 빈 콜아웃 문단으로 커서 이동
    let pos = -1;
    ctx.el.editor.state.doc.descendants((node, p) => {
      if (pos < 0 && (node as unknown as { type: { name: string } }).type.name === "paragraph") pos = p + 1;
    });
    act(() => ctx.el.editor.commands.setTextSelection(pos));
    await ctx.user.keyboard("/callout{Enter}");

    expect((ctx.html().match(/data-type="callout"/g) ?? []).length).toBe(1);
  });
});

describe("에디터 안의 콜아웃 아이콘", () => {
  it("현재 아이콘이 버튼으로 보이고, 같은 아이콘이 두 번 그려지지 않는다", async () => {
    const { container } = await setup('<div data-type="callout" data-emoji="⚠️"><p>주의</p></div><p>뒤</p>');

    const icons = screen.getAllByRole("button", { name: "콜아웃 아이콘 변경" });

    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveTextContent("⚠️");
    // 에디터 쪽은 [data-type=callout]을 달지 않아서 글 상세용 ::before 아이콘이 겹쳐 나오지 않는다
    expect(container.querySelector(".ProseMirror [data-type='callout']")).toBeNull();
    expect(container.querySelector(".ProseMirror .callout-node")).not.toBeNull();
  });

  it("아이콘을 누르면 선택 팝업이 열리고 지금 아이콘이 눌린 상태로 표시된다", async () => {
    const { user } = await setup(CALLOUT_HTML);

    await user.click(screen.getByRole("button", { name: "콜아웃 아이콘 변경" }));

    const picker = screen.getByRole("group", { name: "콜아웃 아이콘 선택" });
    expect(within(picker).getAllByRole("button")).toHaveLength(CALLOUT_EMOJIS.length);
    expect(within(picker).getByRole("button", { name: "아이콘 💡" })).toHaveAttribute("aria-pressed", "true");
    expect(within(picker).getByRole("button", { name: "아이콘 🔥" })).toHaveAttribute("aria-pressed", "false");
  });

  it("다른 아이콘을 고르면 저장되는 HTML이 바뀌고 팝업이 닫힌다", async () => {
    const { user, html } = await setup(CALLOUT_HTML);
    await user.click(screen.getByRole("button", { name: "콜아웃 아이콘 변경" }));

    await user.click(screen.getByRole("button", { name: "아이콘 🔥" }));

    expect(html()).toContain('data-emoji="🔥"');
    expect(screen.queryByRole("group", { name: "콜아웃 아이콘 선택" })).toBeNull();
    expect(screen.getByRole("button", { name: "콜아웃 아이콘 변경" })).toHaveTextContent("🔥");
  });

  it("Escape를 누르면 아이콘을 바꾸지 않고 팝업만 닫힌다", async () => {
    const { user, html } = await setup(CALLOUT_HTML);
    await user.click(screen.getByRole("button", { name: "콜아웃 아이콘 변경" }));

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("group", { name: "콜아웃 아이콘 선택" })).toBeNull());
    expect(html()).toContain('data-emoji="💡"');
  });

  it("팝업 바깥을 누르면 닫힌다", async () => {
    const { user } = await setup(CALLOUT_HTML);
    await user.click(screen.getByRole("button", { name: "콜아웃 아이콘 변경" }));

    fireEvent.mouseDown(document.body);

    await waitFor(() => expect(screen.queryByRole("group", { name: "콜아웃 아이콘 선택" })).toBeNull());
  });

  it("콜아웃이 여러 개면 누른 콜아웃의 아이콘만 바뀐다", async () => {
    const { user, html } = await setup(
      '<div data-type="callout" data-emoji="💡"><p>첫째</p></div><div data-type="callout" data-emoji="💡"><p>둘째</p></div><p>뒤</p>',
    );
    const icons = screen.getAllByRole("button", { name: "콜아웃 아이콘 변경" });

    await user.click(icons[1]);
    await user.click(screen.getByRole("button", { name: "아이콘 ✅" }));

    expect(html()).toBe(
      '<div data-emoji="💡" data-type="callout"><p>첫째</p></div><div data-emoji="✅" data-type="callout"><p>둘째</p></div><p>뒤</p>',
    );
  });
});
