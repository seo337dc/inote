"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { CalloutBase } from "./callout";

// 아이콘 선택 팝업에 보여줄 이모지 (자주 쓰는 강조 표시 위주로 고정)
export const CALLOUT_EMOJIS = ["💡", "📌", "⚠️", "❗", "✅", "❌", "❓", "📝", "🔥", "🚀"];

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const emoji = String(node.attrs.emoji);

  // 팝업이 열려 있는 동안 바깥을 누르거나 Escape를 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    // 클래스는 callout-node — 글 상세(저장된 HTML)는 [data-type="callout"]을 쓴다. 에디터에서는 아이콘을 버튼으로 직접 그리므로
    // ::before로 아이콘을 그리는 [data-type] 규칙이 같이 걸려 아이콘이 두 번 나오지 않게 data-type을 달지 않는다.
    <NodeViewWrapper className="callout-node">
      <div ref={rootRef} contentEditable={false} className="callout-icon-area">
        <button
          type="button"
          aria-label="콜아웃 아이콘 변경"
          aria-expanded={open}
          // 누르는 동안 에디터의 커서가 풀리지 않게 한다
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((v) => !v)}
          className="callout-icon"
        >
          {emoji}
        </button>
        {open && (
          <div role="group" aria-label="콜아웃 아이콘 선택" className="callout-emoji-picker" onMouseDown={(e) => e.preventDefault()}>
            {CALLOUT_EMOJIS.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`아이콘 ${item}`}
                aria-pressed={item === emoji}
                onClick={() => {
                  updateAttributes({ emoji: item });
                  setOpen(false);
                }}
                className={item === emoji ? "is-selected" : undefined}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

// 에디터에 등록하는 콜아웃 — 기본 정의(CalloutBase)에 React 노드뷰를 더한 것
export const Callout = CalloutBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
