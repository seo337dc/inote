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

// 커서가 들어 있는 표의 DOM 요소 (표 밖이면 null)
function findTableElement(view: EditorView): HTMLElement | null {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name !== "table") continue;
    const dom = view.nodeDOM($from.before(depth));
    if (!(dom instanceof HTMLElement)) return null;
    return dom.tagName === "TABLE" ? dom : dom.querySelector("table");
  }
  return null;
}

// 툴바를 표 바로 위에 붙인다. 표가 글 맨 위라 위쪽 공간이 모자라면 표 아래로 내린다.
// 레이아웃이 없는 환경(jsdom)에선 좌표가 0으로 나오는데, 위치 검증이 아니라 표시 여부만 보면 되므로 그대로 둔다.
export function computeTableToolbarPosition(
  view: EditorView,
  wrapper: HTMLElement,
): TableToolbarPosition | null {
  const table = findTableElement(view);
  if (!table) return null;

  const box = wrapper.getBoundingClientRect();
  const rect = table.getBoundingClientRect();
  const contentTop = view.dom.getBoundingClientRect().top;
  const roomAbove = rect.top - contentTop;
  const top =
    roomAbove >= TOOLBAR_HEIGHT + GAP
      ? rect.top - box.top - TOOLBAR_HEIGHT - GAP
      : rect.bottom - box.top + GAP;
  const left = Math.max(rect.left - box.left, 0);
  return { top, left };
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
