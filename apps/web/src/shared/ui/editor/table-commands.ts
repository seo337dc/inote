import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { Command } from "@tiptap/pm/state";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  CellSelection,
  deleteColumn,
  deleteRow,
  deleteTable,
  mergeCells,
  splitCell,
} from "@tiptap/pm/tables";

// 표 편집 툴바가 쓰는 명령 모음. 각 동작이 "지금 실행 가능한지"와 "실행"을 한곳에서 정한다.
// 활성 여부는 실제 명령에 아무것도 하지 않는 dispatch를 넘겨 "돌려보고" 판단한다.
// editor.can()은 쓰면 안 된다 — prosemirror-tables는 "행·열을 전부 지우는 경우"의 거부 판단을
// dispatch가 있을 때만 하기 때문에, can()은 행이 하나뿐이어도 deleteRow를 true로 돌려준다.
// 예) 행이 하나뿐일 때 deleteRow는 false → 툴바에서 비활성, 표를 지우려면 deleteTable을 쓴다.

// 새 표의 기본 크기 — 슬래시 메뉴("/표")와 툴바의 "표" 버튼이 같이 쓴다
export const DEFAULT_TABLE = { rows: 3, cols: 3, withHeaderRow: true } as const;

export type TableAction =
  | "addRowBefore"
  | "addRowAfter"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable"
  | "clearCell"
  | "mergeCells"
  | "splitCell";

type CellRef = { pos: number; node: PMNode };

const isCell = (node: PMNode) => node.type.name === "tableCell" || node.type.name === "tableHeader";

// 선택된 칸들. 드래그로 여러 칸을 골랐으면 전부, 아니면 커서가 들어 있는 칸 하나.
function selectedCells(editor: Editor): CellRef[] {
  const { selection } = editor.state;
  const cells: CellRef[] = [];
  if (selection instanceof CellSelection) {
    selection.forEachCell((node, pos) => cells.push({ node, pos }));
    return cells;
  }
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (isCell(node)) return [{ node, pos: $from.before(depth) }];
  }
  return cells;
}

// 빈 문단 하나만 들어 있으면 비어 있는 칸
const isEmptyCell = (node: PMNode) =>
  node.childCount === 1 && node.firstChild!.type.name === "paragraph" && node.firstChild!.content.size === 0;

function clearCell(editor: Editor, dispatch: boolean): boolean {
  const targets = selectedCells(editor).filter(({ node }) => !isEmptyCell(node));
  if (targets.length === 0) return false;
  if (!dispatch) return true;

  const { state, view } = editor;
  const paragraph = state.schema.nodes.paragraph;
  const tr = state.tr;
  // 뒤쪽 칸부터 바꿔야 앞쪽 칸의 위치가 밀리지 않는다
  [...targets]
    .sort((a, b) => b.pos - a.pos)
    .forEach(({ pos, node }) => {
      tr.replaceWith(pos + 1, pos + node.nodeSize - 1, paragraph.create());
    });
  // 한 칸을 지웠다면 커서를 그 칸 안에 둔다. 여러 칸 선택은 선택 상태를 유지한다.
  if (!(state.selection instanceof CellSelection)) {
    tr.setSelection(TextSelection.near(tr.doc.resolve(tr.mapping.map(targets[0].pos) + 1)));
  }
  view.dispatch(tr);
  return true;
}

const tableCommands: Record<Exclude<TableAction, "clearCell">, Command> = {
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
  mergeCells,
  splitCell,
};

export function canRunTableAction(editor: Editor, action: TableAction): boolean {
  if (action === "clearCell") return clearCell(editor, false);
  return tableCommands[action](editor.state, () => {});
}

// 실행할 수 없는 상태면 문서를 건드리지 않고 false를 돌려준다
export function runTableAction(editor: Editor, action: TableAction): boolean {
  if (!canRunTableAction(editor, action)) return false;
  if (action === "clearCell") return clearCell(editor, true);
  return editor.chain().focus()[action]().run();
}
