import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CellSelection } from "@tiptap/pm/tables";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import PostEditor from "./PostEditor";

type Ed = {
  view: EditorView;
  getHTML: () => string;
  isFocused: boolean;
  state: EditorState;
  commands: {
    setTextSelection: (p: number) => void;
    focus: () => void;
    blur: () => void;
    insertTable: (o: { rows: number; cols: number; withHeaderRow: boolean }) => boolean;
  };
};
type El = HTMLElement & { editor: Ed };

const TABLE_3X3 =
  "<p>표 위</p><table><tbody>" +
  "<tr><th><p>H1</p></th><th><p>H2</p></th></tr>" +
  "<tr><td><p>a1</p></td><td><p>a2</p></td></tr>" +
  "<tr><td><p>b1</p></td><td><p>b2</p></td></tr>" +
  "</tbody></table><p>표 아래</p>";

beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
});

async function setup(initial: string = TABLE_3X3) {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const onUserEdit = vi.fn();
  const { container } = render(<PostEditor content={initial} onChange={onChange} onUserEdit={onUserEdit} />);
  await waitFor(() => expect(container.querySelector(".ProseMirror")).not.toBeNull());
  const el = container.querySelector(".ProseMirror") as El;
  await waitFor(() => expect(el.textContent).not.toBe(""));

  // 텍스트가 들어 있는 위치를 찾아 그 안쪽에 커서를 두고 에디터에 포커스를 준다
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
  // 드래그로 두 칸을 고른 상태 (칸 안쪽 위치 두 곳을 넘기면 그 사이 직사각형이 선택된다)
  const selectCells = (from: string, to: string) => {
    const find = (text: string) => {
      let found = -1;
      el.editor.state.doc.descendants((node, pos) => {
        if (found < 0 && node.isText && node.text === text) found = pos;
      });
      return found;
    };
    const { doc, tr } = el.editor.state;
    const $a = doc.resolve(find(from));
    const $b = doc.resolve(find(to));
    act(() => {
      el.editor.commands.focus();
      el.editor.view.dispatch(
        tr.setSelection(CellSelection.create(doc, $a.before($a.depth - 1), $b.before($b.depth - 1))),
      );
    });
  };
  const toolbar = () => screen.queryByRole("toolbar", { name: "표 편집" });
  const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
  const click = (name: string) => user.click(button(name));
  const rowTexts = () =>
    [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map((c) => c.textContent));
  return { el, user, onChange, onUserEdit, cursorIn, selectCells, toolbar, button, click, rowTexts };
}

describe("표 편집 툴바가 나타나는 조건", () => {
  it("커서가 표 안에 있으면 툴바가 보인다", async () => {
    const { cursorIn, toolbar } = await setup();

    cursorIn("a1");

    await waitFor(() => expect(toolbar()).toBeInTheDocument());
  });

  it("커서가 표 밖 문단에 있으면 툴바가 없다", async () => {
    const { cursorIn, toolbar } = await setup();

    cursorIn("표 위");

    // 그려질 시간을 준 뒤에도 없어야 한다
    await act(async () => {});
    expect(toolbar()).toBeNull();
  });

  it("표 안에서 표 밖으로 커서를 옮기면 툴바가 사라진다", async () => {
    const { cursorIn, toolbar } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(toolbar()).toBeInTheDocument());

    cursorIn("표 아래");

    await waitFor(() => expect(toolbar()).toBeNull());
  });

  it("에디터에 포커스가 없으면 커서가 표 안에 있어도 툴바를 숨긴다", async () => {
    const { el, cursorIn, toolbar } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(toolbar()).toBeInTheDocument());

    act(() => el.editor.commands.blur());

    await waitFor(() => expect(toolbar()).toBeNull());
  });

  it("표가 없는 글에서는 툴바가 없다", async () => {
    const { cursorIn, toolbar } = await setup("<p>그냥 문단</p>");

    cursorIn("그냥 문단");

    await act(async () => {});
    expect(toolbar()).toBeNull();
  });
});

describe("표를 새로 삽입한 직후", () => {
  it("커서가 새 표 안에 놓여 바로 툴바가 뜨고, 3×3 표라 모든 삭제·추가 버튼이 활성이다", async () => {
    const { el, toolbar, button } = await setup("<p>빈 문단</p>");
    act(() => {
      el.editor.commands.focus();
      // 슬래시 명령(/table)이 실행하는 것과 같은 삽입
      el.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
    });

    await waitFor(() => expect(toolbar()).toBeInTheDocument());

    expect(el.querySelectorAll("tr")).toHaveLength(3);
    expect(button("행 삭제")).toBeEnabled();
    expect(button("열 삭제")).toBeEnabled();
    // 새 표의 첫 칸은 이미 비어 있으니 내용 지우기는 꺼져 있다
    expect(button("셀 내용 지우기")).toBeDisabled();
  });
});

describe("툴바 버튼이 글을 바꾼다", () => {
  it("'아래에 행 추가'를 누르면 커서가 있는 행 아래에 빈 행이 생긴다", async () => {
    const { cursorIn, click, rowTexts } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("아래에 행 추가");

    expect(rowTexts()).toEqual([
      ["H1", "H2"],
      ["a1", "a2"],
      ["", ""],
      ["b1", "b2"],
    ]);
  });

  it("'오른쪽에 열 추가'를 누르면 커서가 있는 열 오른쪽에 빈 열이 생긴다", async () => {
    const { cursorIn, click, rowTexts } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("오른쪽에 열 추가");

    expect(rowTexts()[1]).toEqual(["a1", "", "a2"]);
  });

  it("'행 삭제'를 누르면 커서가 있는 행만 사라진다", async () => {
    const { cursorIn, click, rowTexts } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("행 삭제");

    expect(rowTexts()).toEqual([
      ["H1", "H2"],
      ["b1", "b2"],
    ]);
  });

  it("'열 삭제'를 누르면 커서가 있는 열만 사라진다", async () => {
    const { cursorIn, click, rowTexts } = await setup();
    cursorIn("a2");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("열 삭제");

    expect(rowTexts()[1]).toEqual(["a1"]);
  });

  it("'셀 내용 지우기'를 누르면 그 칸만 비워진다", async () => {
    const { cursorIn, click, rowTexts } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("셀 내용 지우기");

    expect(rowTexts()[1]).toEqual(["", "a2"]);
  });

  it("'표 삭제'를 누르면 표가 사라지고 툴바도 함께 사라진다", async () => {
    const { el, cursorIn, click, toolbar } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(toolbar()).toBeInTheDocument());

    await click("표 삭제");

    expect(el.querySelector("table")).toBeNull();
    expect(el.textContent).toContain("표 위");
    expect(el.textContent).toContain("표 아래");
    await waitFor(() => expect(toolbar()).toBeNull());
  });

  it("버튼으로 고친 내용은 onChange로 나가고 사용자 편집으로도 알려진다", async () => {
    const { cursorIn, click, onChange, onUserEdit } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());
    onChange.mockClear();
    onUserEdit.mockClear();

    await click("아래에 행 추가");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0].match(/<tr>/g)).toHaveLength(4);
    expect(onUserEdit).toHaveBeenCalled();
  });

  it("버튼을 눌러도 에디터 커서가 그대로 남아 이어서 입력할 수 있다", async () => {
    const { el, cursorIn, click, user } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("셀 내용 지우기");
    await user.keyboard("새 글");

    expect(el.querySelectorAll("tr")[1].children[0].textContent).toBe("새 글");
  });

  it("버튼의 mousedown 기본 동작을 막아 포커스가 에디터를 떠나지 않게 한다", async () => {
    const { cursorIn, button } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    // fireEvent는 기본 동작이 막히지 않았을 때만 true를 돌려준다
    expect(fireEvent.mouseDown(button("행 삭제"))).toBe(false);
  });
});

describe("셀 병합·분할 버튼", () => {
  it("두 칸을 골라 '셀 병합'을 누르면 한 칸으로 합쳐지고, 병합 버튼은 꺼지고 분할 버튼이 켜진다", async () => {
    const { el, selectCells, click, button } = await setup();
    selectCells("a1", "a2");
    await waitFor(() => expect(button("셀 병합")).toBeEnabled());

    await click("셀 병합");

    const merged = el.querySelectorAll("tr")[1].children[0];
    expect(merged.getAttribute("colspan")).toBe("2");
    await waitFor(() => expect(button("셀 분할")).toBeEnabled());
    expect(button("셀 병합")).toBeDisabled();
  });

  it("합쳐진 칸에서 '셀 분할'을 누르면 다시 두 칸이 된다", async () => {
    const { el, selectCells, click, button } = await setup();
    selectCells("a1", "a2");
    await waitFor(() => expect(button("셀 병합")).toBeEnabled());
    await click("셀 병합");
    await waitFor(() => expect(button("셀 분할")).toBeEnabled());

    await click("셀 분할");

    expect(el.querySelector('[colspan="2"]')).toBeNull();
    expect(el.querySelectorAll("tr")[1].children).toHaveLength(2);
  });

  it("여러 칸을 고른 채 '셀 내용 지우기'를 누르면 고른 칸이 모두 비워진다", async () => {
    const { selectCells, click, button, rowTexts } = await setup();
    selectCells("a1", "b2");
    await waitFor(() => expect(button("셀 내용 지우기")).toBeEnabled());

    await click("셀 내용 지우기");

    expect(rowTexts()).toEqual([
      ["H1", "H2"],
      ["", ""],
      ["", ""],
    ]);
  });
});

describe("실행할 수 없는 버튼은 비활성이다", () => {
  it("칸 하나에 커서만 있으면 병합·분할이 비활성이고 나머지는 활성이다", async () => {
    const { cursorIn, button } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    expect(button("셀 병합")).toBeDisabled();
    expect(button("셀 분할")).toBeDisabled();
    expect(button("위에 행 추가")).toBeEnabled();
    expect(button("행 삭제")).toBeEnabled();
    expect(button("표 삭제")).toBeEnabled();
  });

  it("행이 하나뿐인 표는 '행 삭제'가 비활성이고 '표 삭제'만 쓸 수 있다", async () => {
    const { cursorIn, button } = await setup(
      "<table><tbody><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table>",
    );
    cursorIn("x");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    expect(button("행 삭제")).toBeDisabled();
    expect(button("열 삭제")).toBeEnabled();
    expect(button("표 삭제")).toBeEnabled();
  });

  it("이미 빈 칸이면 '셀 내용 지우기'가 비활성이다", async () => {
    const { cursorIn, click, button } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    await click("셀 내용 지우기");

    await waitFor(() => expect(button("셀 내용 지우기")).toBeDisabled());
  });

  it("비활성 버튼을 눌러도 글이 바뀌지 않는다", async () => {
    const { el, cursorIn, button, user } = await setup(
      "<table><tbody><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table>",
    );
    cursorIn("x");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());
    const before = el.editor.getHTML();

    await user.click(button("행 삭제"));

    expect(el.editor.getHTML()).toBe(before);
  });
});

describe("접근성", () => {
  it("툴바는 행·열·셀·표 그룹으로 나뉜다", async () => {
    const { cursorIn } = await setup();
    cursorIn("a1");
    await waitFor(() => expect(screen.getByRole("toolbar", { name: "표 편집" })).toBeInTheDocument());

    for (const name of ["행", "열", "셀", "표"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
  });
});
