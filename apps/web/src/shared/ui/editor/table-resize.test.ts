import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { columnResizingPluginKey } from "@tiptap/pm/tables";
import { TABLE_OPTIONS } from "./table-commands";

// 에디터와 같은 표 설정(TABLE_OPTIONS)으로 만든 에디터
let editor: Editor;
function setup(content: string) {
  editor = new Editor({
    extensions: [StarterKit, Table.configure(TABLE_OPTIONS), TableRow, TableHeader, TableCell],
    content,
  });
  return editor;
}
afterEach(() => editor?.destroy());

const TABLE_2COLS = (colwidthA: string, colwidthB: string) =>
  `<table><tbody><tr><th${colwidthA}><p>A</p></th><th${colwidthB}><p>B</p></th></tr>` +
  `<tr><td${colwidthA}><p>a</p></td><td${colwidthB}><p>b</p></td></tr></tbody></table>`;

describe("표 열 너비 조절", () => {
  it("열 너비 조절이 켜져 있고 최소 너비가 정해져 있다", () => {
    expect(TABLE_OPTIONS.resizable).toBe(true);
    expect(TABLE_OPTIONS.cellMinWidth).toBeGreaterThanOrEqual(40);
  });

  it("편집 가능한 에디터에는 열 경계를 드래그하는 플러그인이 붙는다", () => {
    setup(TABLE_2COLS("", ""));

    expect(columnResizingPluginKey.getState(editor.state)).toBeDefined();
  });

  it("바꾼 너비는 칸의 colwidth로 저장되고, 표의 colgroup에도 같은 너비가 담긴다 (글 상세에 그대로 보이게)", () => {
    setup(TABLE_2COLS("", ""));
    // 첫 칸에 커서를 두고 그 열의 너비를 200으로 (드래그가 하는 일과 같다)
    editor.commands.setTextSelection(4);
    editor.chain().setCellAttribute("colwidth", [200]).run();

    const html = editor.getHTML();
    expect(html).toContain('colwidth="200"');
    expect(html).toMatch(/<col style="width: 200px;?"/);
  });

  it("저장된 너비(colwidth)를 다시 열면 그대로 읽는다 — 글을 저장했다 다시 수정해도 너비가 유지된다", () => {
    setup(TABLE_2COLS(' colwidth="150"', ' colwidth="320"'));

    expect(editor.getHTML()).toContain('colwidth="150"');
    expect(editor.getHTML()).toContain('colwidth="320"');
    const widths: number[][] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "tableHeader") widths.push(node.attrs.colwidth);
    });
    expect(widths).toEqual([[150], [320]]);
  });

  it("모든 열에 너비가 있으면 표 전체 너비도 그 합으로 저장된다", () => {
    setup(TABLE_2COLS(' colwidth="150"', ' colwidth="320"'));

    expect(editor.getHTML()).toMatch(/<table[^>]*style="width: 470px/);
  });

  it("너비를 바꾸지 않은 표(옛 글)는 colwidth 없이 그대로 저장된다", () => {
    setup(TABLE_2COLS("", ""));

    expect(editor.getHTML()).not.toContain("colwidth");
  });

  it("셀을 병합해도(colspan) 너비 정보가 칸 폭만큼 유지된다", () => {
    setup(
      '<table><tbody><tr><td colspan="2" colwidth="100,200"><p>합침</p></td></tr>' +
        '<tr><td colwidth="100"><p>a</p></td><td colwidth="200"><p>b</p></td></tr></tbody></table>',
    );

    const cell = editor.state.doc.firstChild!.firstChild!.firstChild!;
    expect(cell.attrs.colspan).toBe(2);
    expect(cell.attrs.colwidth).toEqual([100, 200]);
  });
});
