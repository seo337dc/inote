"use client";

import { useEffect, useRef, useState } from "react";
import { getMarkRange, type Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Pencil } from "lucide-react";

const POPUP_WIDTH = 320;

export type LinkPopupState = {
  // edit: 이미 링크인 글자 / create: 링크를 새로 거는 중
  mode: "edit" | "create";
  from: number;
  to: number;
  href: string;
  // 에디터 래퍼(position: relative) 기준 위치
  top: number;
  left: number;
};

// 지금 선택(또는 커서) 근처에 링크가 있으면 그 범위를 돌려준다.
// editor.isActive("link")는 선택 전체가 링크일 때만 true라서, 링크 옆 글자까지 같이 드래그했거나
// 커서가 링크 끝 경계에 있으면 링크가 아니라고 판단해버린다 — 그래서 "범위 안에 링크가 하나라도 있는지"로 본다.
export function findLinkRange(state: EditorState): { from: number; to: number } | null {
  const { doc, selection, schema } = state;
  const linkType = schema.marks.link;
  if (!linkType) return null;

  const { from, to, empty } = selection;
  if (!empty) return doc.rangeHasMark(from, to, linkType) ? { from, to } : null;

  // 커서만 있으면 커서가 놓인 링크 전체(경계에 붙어 있는 경우 포함)를 대상으로 한다
  return getMarkRange(doc.resolve(from), linkType) ?? null;
}

// 입력한 주소를 링크로 쓸 수 있게 다듬는다 — 스킴이 없으면 https://를 붙이고,
// 내부 경로(/…), 앵커(#…), mailto:/tel: 은 그대로 둔다. 빈 값이면 빈 문자열.
export function normalizeHref(raw: string): string {
  const value = raw.trim();
  if (!value || value === "https://") return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.startsWith("#")) {
    return value;
  }
  return `https://${value}`;
}

// 링크 팝업을 어디에 어떤 모드로 띄울지 계산한다.
// pos가 있으면 그 자리(클릭한 곳)의 링크를, 없으면 현재 선택을 기준으로 한다.
export function computeLinkPopup(
  view: EditorView,
  wrapper: HTMLElement,
  pos?: number,
): LinkPopupState | null {
  const { doc, selection, schema } = view.state;
  const linkType = schema.marks.link;
  if (!linkType) return null;

  const range =
    pos !== undefined
      ? (getMarkRange(doc.resolve(pos), linkType) ?? null)
      : findLinkRange(view.state);

  const mode: LinkPopupState["mode"] = range ? "edit" : "create";
  if (pos !== undefined && !range) return null; // 클릭한 곳이 링크가 아니면 띄우지 않음
  const from = range ? range.from : selection.from;
  const to = range ? range.to : selection.to;

  let href = "";
  if (range) {
    doc.nodesBetween(from, to, (node) => {
      if (href) return false;
      const mark = node.marks.find((m) => m.type === linkType);
      if (mark) href = String(mark.attrs.href ?? "");
      return true;
    });
  }

  // 글자 시작 x, 글자 끝 아래 y에 붙인다. 레이아웃이 없는 환경(jsdom)에선 좌표 계산이 실패할 수 있음
  let top = 0;
  let left = 0;
  try {
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const box = wrapper.getBoundingClientRect();
    top = end.bottom - box.top + 6;
    left = Math.min(Math.max(start.left - box.left, 0), Math.max(box.width - POPUP_WIDTH, 0));
  } catch {
    // 위치를 못 구하면 래퍼 왼쪽 위에 둔다
  }

  return { mode, from, to, href, top, left };
}

type Props = {
  editor: Editor;
  state: LinkPopupState;
  // refocus: true면 에디터로 커서를 돌려준다 (바깥을 눌러 닫을 땐 false)
  onClose: (refocus: boolean) => void;
};

export function LinkPopover({ editor, state, onClose }: Props) {
  const [value, setValue] = useState(state.href);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // 팝업 바깥을 누르면 닫는다 (링크를 다시 누르는 경우는 그 클릭이 새 팝업을 연다)
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!popupRef.current?.contains(e.target as Node)) onClose(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  // 이미 걸린 링크를 고치는 중에 커서가 그 링크 밖으로 나가면 닫는다
  useEffect(() => {
    if (state.mode !== "edit") return;
    function onSelectionUpdate() {
      const { from, to } = editor.state.selection;
      if (from < state.from || to > state.to) onClose(false);
    }
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, state, onClose]);

  function removeLink() {
    editor
      .chain()
      .focus()
      .command(({ tr, state: s }) => {
        tr.removeMark(state.from, state.to, s.schema.marks.link);
        return true;
      })
      .run();
    onClose(false);
  }

  function apply() {
    const href = normalizeHref(value);
    if (!href) {
      // 비워서 적용하면: 이미 있던 링크는 해제, 새 링크는 아무것도 하지 않음
      if (state.mode === "edit") removeLink();
      else onClose(true);
      return;
    }
    if (state.mode === "create" && state.from === state.to) {
      // 고른 글자가 없으면 주소 자체를 링크 글자로 넣는다
      editor
        .chain()
        .focus()
        .insertContentAt(state.from, {
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().setTextSelection({ from: state.from, to: state.to }).setLink({ href }).run();
    }
    onClose(false);
  }

  const openHref = normalizeHref(value) || state.href;

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="링크 편집"
      style={{ top: state.top, left: state.left, width: POPUP_WIDTH }}
      className="absolute z-20 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose(true);
        }
      }}
    >
      {/* 에디터가 글쓰기 <form> 안에 들어 있어서 여기서 또 <form>을 쓰면 중첩되고 Enter가 글 저장 흐름을 탄다 */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        aria-label="링크 주소"
        placeholder="https://"
        className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500"
      />
      <div className="mt-2 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={apply}
          className="rounded bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-800"
        >
          적용
        </button>
        {state.mode === "edit" && (
          <>
            <button
              type="button"
              onClick={removeLink}
              className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
            >
              링크 해제
            </button>
            {openHref && (
              <a
                href={openHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
              >
                새 탭에서 열기
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export type LinkHoverState = {
  // 링크 글자 안쪽 문서 위치 — 편집 팝업을 열 때 어느 링크인지 찾는 데 쓴다
  pos: number;
  top: number;
  left: number;
};

// 마우스를 올린 링크 <a>의 끝(오른쪽)에 붙일 아이콘 위치를 계산한다. 여러 줄로 꺾인 링크는 마지막 줄 기준.
export function computeLinkHover(
  view: EditorView,
  wrapper: HTMLElement,
  anchor: HTMLElement,
): LinkHoverState | null {
  let pos: number;
  try {
    pos = view.posAtDOM(anchor, 0) + 1;
  } catch {
    return null;
  }
  const box = wrapper.getBoundingClientRect();
  const rects = anchor.getClientRects();
  const rect = rects.length > 0 ? rects[rects.length - 1] : anchor.getBoundingClientRect();
  return {
    pos,
    top: rect.top - box.top + (rect.height - HOVER_ICON_SIZE) / 2,
    left: rect.right - box.left + 4,
  };
}

const HOVER_ICON_SIZE = 22;

type EditButtonProps = {
  state: LinkHoverState;
  onEdit: () => void;
  // 링크에서 아이콘으로 마우스를 옮기는 사이에 아이콘이 사라지지 않도록 알린다
  onEnter: () => void;
  onLeave: () => void;
};

// 링크 위에 마우스를 올렸을 때만 나타나는 작은 편집 아이콘. 누르면 주소 편집 팝업이 열린다.
export function LinkEditButton({ state, onEdit, onEnter, onLeave }: EditButtonProps) {
  return (
    <button
      type="button"
      aria-label="링크 편집"
      title="링크 주소 편집"
      style={{ top: state.top, left: state.left, width: HOVER_ICON_SIZE, height: HOVER_ICON_SIZE }}
      // mousedown에서 포커스가 옮겨가 에디터 선택이 바뀌는 것을 막는다
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onEdit}
      className="absolute z-10 flex items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-100 hover:text-zinc-800"
    >
      <Pencil className="size-3" aria-hidden />
    </button>
  );
}
