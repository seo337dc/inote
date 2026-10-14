"use client";

import type { RefObject } from "react";
import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { useEditorState } from "@tiptap/react";
import { canRunTableAction, runTableAction, type TableAction } from "./table-commands";

const TOOLBAR_HEIGHT = 36;
const GAP = 6;

export type TableToolbarPosition = {
  // 에디터 래퍼(position: relative) 기준 위치
  top: number;
  left: number;
};

type ToolbarGroup = {
  label: string;
  items: { action: TableAction; text: string; name: string }[];
};

const GROUPS: ToolbarGroup[] = [
  {
    label: "행",
    items: [
      { action: "addRowBefore", text: "+ 위에 행", name: "위에 행 추가" },
      { action: "addRowAfter", text: "+ 아래에 행", name: "아래에 행 추가" },
      { action: "deleteRow", text: "행 삭제", name: "행 삭제" },
    ],
  },
  {
    label: "열",
    items: [
      { action: "addColumnBefore", text: "+ 왼쪽 열", name: "왼쪽에 열 추가" },
      { action: "addColumnAfter", text: "+ 오른쪽 열", name: "오른쪽에 열 추가" },
      { action: "deleteColumn", text: "열 삭제", name: "열 삭제" },
    ],
  },
  {
    label: "셀",
    items: [
      { action: "mergeCells", text: "병합", name: "셀 병합" },
      { action: "splitCell", text: "분할", name: "셀 분할" },
      { action: "clearCell", text: "내용 지우기", name: "셀 내용 지우기" },
    ],
  },
  {
    label: "표",
    items: [{ action: "deleteTable", text: "표 삭제", name: "표 삭제" }],
  },
];

const ACTIONS = GROUPS.flatMap((g) => g.items.map((i) => i.action));

// 커서가 들어 있는 표와 그 안의 행(tr) DOM 요소 (표 밖이면 null)
function findTableParts(view: EditorView): { table: HTMLElement; row: HTMLElement | null } | null {
  const { $from } = view.state.selection;
  let row: HTMLElement | null = null;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === "tableRow" && !row) {
      const dom = view.nodeDOM($from.before(depth));
      if (dom instanceof HTMLElement) row = dom;
    }
    if (name !== "table") continue;
    const dom = view.nodeDOM($from.before(depth));
    if (!(dom instanceof HTMLElement)) return null;
    const table = dom.tagName === "TABLE" ? dom : dom.querySelector<HTMLElement>("table");
    return table ? { table, row } : null;
  }
  return null;
}

type Rect = { top: number; bottom: number; left: number };

// 툴바를 커서가 있는 행 바로 위에 붙인다 — 표가 길어도 툴바가 표 맨 위로 가버리지 않고 커서를 따라다닌다.
// 행 위쪽(에디터 본문 맨 위까지)에 자리가 모자라면 그 행 아래로 내린다. 좌우는 표의 왼쪽 끝에 맞춘다.
// 모두 화면 좌표(getBoundingClientRect)이고, wrapper는 툴바가 기대는 position: relative 상자다.
export function placeTableToolbar(args: {
  row: Rect;
  table: Rect;
  wrapper: Rect;
  contentTop: number;
}): TableToolbarPosition {
  const { row, table, wrapper, contentTop } = args;
  const roomAbove = row.top - contentTop;
  const top =
    roomAbove >= TOOLBAR_HEIGHT + GAP
      ? row.top - wrapper.top - TOOLBAR_HEIGHT - GAP
      : row.bottom - wrapper.top + GAP;
  const left = Math.max(table.left - wrapper.left, 0);
  return { top, left };
}

// 레이아웃이 없는 환경(jsdom)에선 좌표가 0으로 나오는데, 위치 검증이 아니라 표시 여부만 보면 되므로 그대로 둔다.
export function computeTableToolbarPosition(
  view: EditorView,
  wrapper: HTMLElement,
): TableToolbarPosition | null {
  const parts = findTableParts(view);
  if (!parts) return null;

  const tableRect = parts.table.getBoundingClientRect();
  const rowRect = (parts.row ?? parts.table).getBoundingClientRect();
  return placeTableToolbar({
    row: rowRect,
    table: tableRect,
    wrapper: wrapper.getBoundingClientRect(),
    contentTop: view.dom.getBoundingClientRect().top,
  });
}

type ToolbarState = {
  position: TableToolbarPosition;
  enabled: Record<TableAction, boolean>;
} | null;

export function TableToolbar({
  editor,
  wrapperRef,
}: {
  editor: Editor;
  wrapperRef: RefObject<HTMLDivElement | null>;
}) {
  // 선택이 바뀔 때마다 표 안인지·각 동작이 가능한지 다시 계산한다 (Tiptap v3는 기본으로 리렌더하지 않음)
  const state = useEditorState({
    editor,
    selector: ({ editor }): ToolbarState => {
      if (!editor || !editor.isFocused || !wrapperRef.current) return null;
      const position = computeTableToolbarPosition(editor.view, wrapperRef.current);
      if (!position) return null;
      const enabled = Object.fromEntries(
        ACTIONS.map((action) => [action, canRunTableAction(editor, action)]),
      ) as Record<TableAction, boolean>;
      return { position, enabled };
    },
  });

  if (!state) return null;

  return (
    <div
      role="toolbar"
      aria-label="표 편집"
      // 버튼을 눌러도 에디터의 커서·칸 선택이 풀리지 않게 한다
      onMouseDown={(e) => e.preventDefault()}
      style={{ top: state.position.top, left: state.position.left }}
      className="absolute z-10 flex max-w-full flex-wrap items-center gap-x-1 gap-y-0.5 rounded border border-zinc-200 bg-white px-1.5 py-1 shadow-sm"
    >
      {GROUPS.map((group, i) => (
        <div
          key={group.label}
          role="group"
          aria-label={group.label}
          className={`flex items-center gap-0.5 ${i > 0 ? "border-l border-zinc-200 pl-1" : ""}`}
        >
          {group.items.map(({ action, text, name }) => (
            <button
              key={action}
              type="button"
              aria-label={name}
              disabled={!state.enabled[action]}
              onClick={() => runTableAction(editor, action)}
              className={`whitespace-nowrap rounded px-1.5 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent ${
                action === "deleteTable" ? "text-red-600" : "text-zinc-700"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
