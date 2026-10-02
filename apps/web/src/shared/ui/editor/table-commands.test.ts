import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { CellSelection } from "@tiptap/pm/tables";
import { canRunTableAction, runTableAction } from "./table-commands";

// 헤더 행 1개 + 본문 행 2개, 3열짜리 표 아래에 표 밖 문단 하나
const TABLE_3X3 =
  "<table><tbody>" +
  "<tr><th><p>H1</p></th><th><p>H2</p></th><th><p>H3</p></th></tr>" +
  "<tr><td><p>a1</p></td><td><p>a2</p></td><td><p>a3</p></td></tr>" +
  "<tr><td><p>b1</p></td><td><p>b2</p></td><td><p>b3</p></td></tr>" +
  "</tbody></table><p>표 밖</p>";

let editor: Editor;

function setup(content: string) {
  editor = new Editor({
    extensions: [StarterKit, Table.configure({ resizable: false }), TableRow, TableHeader, TableCell],
    content,
  });
  return editor;
}

afterEach(() => editor?.destroy());

// 텍스트가 들어 있는 위치(문서 좌표)를 찾는다
function posOf(text: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text === text) found = pos;
  });
  if (found < 0) throw new Error(`텍스트를 찾을 수 없음: ${text}`);
  return found;
}
const cursorIn = (text: string) => editor.commands.setTextSelection(posOf(text) + 1);

// 두 칸을 드래그로 고른 상태 (칸 안쪽 위치 두 곳을 넘기면 그 사이 직사각형이 선택된다)
function selectCells(from: string, to: string) {
  const { doc, tr } = editor.state;
  const $a = doc.resolve(posOf(from));
  const $b = doc.resolve(posOf(to));
  editor.view.dispatch(tr.setSelection(CellSelection.create(doc, $a.before($a.depth - 1), $b.before($b.depth - 1))));
}

function table() {
  const root = document.createElement("div");
  root.innerHTML = editor.getHTML();
  return root;
}
const rows = () => table().querySelectorAll("tr").length;
const cols = () => table().querySelector("tr")!.children.length;
const cellTexts = (r: number) => [...table().querySelectorAll("tr")[r].children].map((c) => c.textContent);

describe("행 추가", () => {
  it("위에 행 추가: 커서가 있는 행 바로 위에 빈 행이 생기고 열 수는 그대로다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "addRowBefore")).toBe(true);

    expect(rows()).toBe(4);
    expect(cols()).toBe(3);
    expect(cellTexts(1)).toEqual(["", "", ""]);
    expect(cellTexts(2)).toEqual(["a1", "a2", "a3"]);
  });

  it("아래에 행 추가: 커서가 있는 행 바로 아래에 빈 행이 생긴다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "addRowAfter")).toBe(true);

    expect(rows()).toBe(4);
    expect(cellTexts(1)).toEqual(["a1", "a2", "a3"]);
    expect(cellTexts(2)).toEqual(["", "", ""]);
  });
});

describe("열 추가", () => {
  it("왼쪽에 열 추가: 커서가 있는 열 왼쪽에 빈 열이 생긴다 (헤더 행에는 헤더 칸이 생긴다)", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "addColumnBefore")).toBe(true);

    expect(cols()).toBe(4);
    expect(cellTexts(1)).toEqual(["a1", "", "a2", "a3"]);
    expect(table().querySelectorAll("tr")[0].children[1].tagName).toBe("TH");
  });

  it("오른쪽에 열 추가: 커서가 있는 열 오른쪽에 빈 열이 생긴다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "addColumnAfter")).toBe(true);

    expect(cols()).toBe(4);
    expect(cellTexts(1)).toEqual(["a1", "a2", "", "a3"]);
  });
});

describe("행·열 삭제", () => {
  it("행 삭제: 커서가 있는 행만 사라진다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "deleteRow")).toBe(true);

    expect(rows()).toBe(2);
    expect(cellTexts(1)).toEqual(["b1", "b2", "b3"]);
  });

  it("열 삭제: 커서가 있는 열만 사라진다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "deleteColumn")).toBe(true);

    expect(cols()).toBe(2);
    expect(cellTexts(1)).toEqual(["a1", "a3"]);
  });

  it("행이 하나뿐이면 행 삭제는 비활성이고 실행해도 표가 그대로다", () => {
    setup("<table><tbody><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table>");
    cursorIn("x");
    const before = editor.getHTML();

    expect(canRunTableAction(editor, "deleteRow")).toBe(false);
    expect(runTableAction(editor, "deleteRow")).toBe(false);

    expect(editor.getHTML()).toBe(before);
  });

  it("열이 하나뿐이면 열 삭제는 비활성이고 실행해도 표가 그대로다", () => {
    setup("<table><tbody><tr><td><p>x</p></td></tr><tr><td><p>y</p></td></tr></tbody></table>");
    cursorIn("x");
    const before = editor.getHTML();

    expect(canRunTableAction(editor, "deleteColumn")).toBe(false);
    expect(runTableAction(editor, "deleteColumn")).toBe(false);

    expect(editor.getHTML()).toBe(before);
  });

  it("헤더 행도 삭제할 수 있다 (남은 첫 행은 일반 칸이 된다)", () => {
    setup(TABLE_3X3);
    cursorIn("H2");

    const ok = runTableAction(editor, "deleteRow");

    expect(ok).toBe(true);
    expect(rows()).toBe(2);
    expect(cellTexts(0)).toEqual(["a1", "a2", "a3"]);
    expect(table().querySelector("th")).toBeNull();
  });
});

describe("표 삭제", () => {
  it("표 전체가 사라지고 표 밖 내용은 남는다", () => {
    setup(TABLE_3X3);
    cursorIn("b3");

    expect(runTableAction(editor, "deleteTable")).toBe(true);

    expect(table().querySelector("table")).toBeNull();
    expect(editor.getText()).toBe("표 밖");
  });
});

describe("셀 내용 지우기", () => {
  it("커서가 있는 칸의 내용만 비우고 칸 구조와 다른 칸은 그대로다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    expect(runTableAction(editor, "clearCell")).toBe(true);

    expect(rows()).toBe(3);
    expect(cols()).toBe(3);
    expect(cellTexts(1)).toEqual(["a1", "", "a3"]);
    expect(cellTexts(2)).toEqual(["b1", "b2", "b3"]);
  });

  it("지운 뒤에는 커서가 그 칸 안에 남아 바로 다시 입력할 수 있다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    runTableAction(editor, "clearCell");
    editor.commands.insertContent("새 내용");

    expect(cellTexts(1)).toEqual(["a1", "새 내용", "a3"]);
  });

  it("여러 칸을 드래그로 골랐으면 고른 칸을 모두 비운다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "b2");

    expect(runTableAction(editor, "clearCell")).toBe(true);

    expect(cellTexts(1)).toEqual(["", "", "a3"]);
    expect(cellTexts(2)).toEqual(["", "", "b3"]);
    expect(cellTexts(0)).toEqual(["H1", "H2", "H3"]);
  });

  it("이미 빈 칸이면 비활성이고 실행해도 변화가 없다", () => {
    setup("<table><tbody><tr><td><p></p></td><td><p>y</p></td></tr></tbody></table>");
    editor.commands.setTextSelection(4);
    const before = editor.getHTML();

    expect(canRunTableAction(editor, "clearCell")).toBe(false);
    expect(runTableAction(editor, "clearCell")).toBe(false);

    expect(editor.getHTML()).toBe(before);
  });

  it("실행 취소(undo)하면 지운 내용이 돌아온다", () => {
    setup(TABLE_3X3);
    cursorIn("a2");

    runTableAction(editor, "clearCell");
    editor.commands.undo();

    expect(cellTexts(1)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("셀 병합·분할", () => {
  it("칸 하나만 선택했을 땐 병합이 비활성이다", () => {
    setup(TABLE_3X3);
    cursorIn("a1");

    expect(canRunTableAction(editor, "mergeCells")).toBe(false);
  });

  it("가로로 이웃한 두 칸을 고르면 병합되어 colspan 2가 되고 내용이 합쳐진다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "a2");

    expect(runTableAction(editor, "mergeCells")).toBe(true);

    const merged = table().querySelectorAll("tr")[1].children[0];
    expect(merged.getAttribute("colspan")).toBe("2");
    expect(merged.textContent).toContain("a1");
    expect(merged.textContent).toContain("a2");
  });

  it("병합되지 않은 일반 칸에선 분할이 비활성이다", () => {
    setup(TABLE_3X3);
    cursorIn("a1");

    expect(canRunTableAction(editor, "splitCell")).toBe(false);
  });

  it("병합된 칸에 커서가 있으면 분할할 수 있고, 분할하면 colspan이 사라진다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "a2");
    runTableAction(editor, "mergeCells");
    cursorIn("a1");

    expect(canRunTableAction(editor, "splitCell")).toBe(true);
    expect(runTableAction(editor, "splitCell")).toBe(true);

    expect(table().querySelector('[colspan="2"]')).toBeNull();
    expect(table().querySelectorAll("tr")[1].children.length).toBe(3);
  });
});

describe("셀 병합·분할 (세로·사각형·빈 칸)", () => {
  it("세로로 이웃한 두 칸을 고르면 병합되어 rowspan 2가 되고, 분할하면 칸 수가 원래대로 돌아온다", () => {
    setup(TABLE_3X3);
    selectCells("a2", "b2");

    expect(runTableAction(editor, "mergeCells")).toBe(true);

    const merged = [...table().querySelectorAll("td")].find((c) => c.getAttribute("rowspan") === "2")!;
    expect(merged.textContent).toContain("a2");
    expect(merged.textContent).toContain("b2");
    expect(cellTexts(2)).toHaveLength(2); // 병합된 칸이 윗 행에서 두 행을 차지해서 아랫 행은 칸이 하나 적다

    cursorIn("a2");
    expect(runTableAction(editor, "splitCell")).toBe(true);

    expect(table().querySelector('[rowspan="2"]')).toBeNull();
    expect(cellTexts(2)).toHaveLength(3);
  });

  it("2×2로 고르면 colspan 2, rowspan 2인 한 칸이 된다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "b2");

    expect(runTableAction(editor, "mergeCells")).toBe(true);

    const merged = table().querySelectorAll("tr")[1].children[0];
    expect(merged.getAttribute("colspan")).toBe("2");
    expect(merged.getAttribute("rowspan")).toBe("2");
  });

  it("빈 칸과 병합하면 빈 문단이 남지 않고 있는 내용만 합쳐진다", () => {
    setup(
      "<table><tbody><tr><td><p>x</p></td><td><p></p></td></tr><tr><td><p>y</p></td><td><p>z</p></td></tr></tbody></table>",
    );
    selectCells("x", "y");

    expect(runTableAction(editor, "mergeCells")).toBe(true);

    expect(table().querySelectorAll("tr")[0].children[0].querySelectorAll("p")).toHaveLength(2);
  });

  it("병합된 칸을 고른 상태에서는 병합이 비활성이고 분할이 활성이다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "a2");
    runTableAction(editor, "mergeCells");

    expect(canRunTableAction(editor, "mergeCells")).toBe(false);
    expect(canRunTableAction(editor, "splitCell")).toBe(true);
  });

  it("병합된 칸이 있는 표에서도 행 삭제·열 추가·내용 지우기가 동작한다", () => {
    setup(TABLE_3X3);
    selectCells("a1", "a2");
    runTableAction(editor, "mergeCells");
    cursorIn("b3");

    expect(runTableAction(editor, "deleteRow")).toBe(true);
    expect(rows()).toBe(2);

    cursorIn("a3");
    expect(runTableAction(editor, "addColumnAfter")).toBe(true);
    expect(runTableAction(editor, "clearCell")).toBe(true);
    expect(table().querySelectorAll("tr")[1].children).toHaveLength(3);
  });
});

describe("표 밖에서는 모든 동작이 비활성이다", () => {
  it.each([
    "addRowBefore",
    "addRowAfter",
    "addColumnBefore",
    "addColumnAfter",
    "deleteRow",
    "deleteColumn",
    "deleteTable",
    "clearCell",
    "mergeCells",
    "splitCell",
  ] as const)("%s", (action) => {
    setup(TABLE_3X3);
    cursorIn("표 밖");
    const before = editor.getHTML();

    expect(canRunTableAction(editor, action)).toBe(false);
    expect(runTableAction(editor, action)).toBe(false);

    expect(editor.getHTML()).toBe(before);
  });
});
