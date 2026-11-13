"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipsis, type LucideIcon } from "lucide-react";
import { toolbarButtonClass } from "./toolbar-button-style";

export type ToolbarMoreItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  /** Tiptap 단축키 문자열(예: "Mod-b") — 넓은 화면 툴바 버튼의 툴팁에만 쓴다(터치용 팝오버에는 hover가 없다) */
  shortcut?: string;
};

/**
 * 좁은 화면 툴바의 `…` 버튼과, 누르면 툴바 아래에 뜨는 아이콘 팝오버.
 * 툴바 스크롤 영역(overflow-x-auto) 안에 두면 팝오버가 잘리므로, 스크롤 영역 바깥(툴바 래퍼 기준 absolute)에서 쓴다.
 * 항목을 누르면 동작을 실행하고 닫힌다. 바깥 누르기·Esc로도 닫힌다.
 */
export function ToolbarMoreMenu({ items }: { items: ToolbarMoreItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const anyActive = items.some((item) => item.active);

  return (
    <div ref={rootRef} className="shrink-0 border-l border-zinc-200 px-1 py-1.5">
      <button
        type="button"
        aria-label="더보기"
        aria-expanded={open}
        aria-haspopup="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={`rounded px-2 py-1 hover:bg-zinc-100 ${
          open || anyActive ? "bg-zinc-100 text-zinc-900" : "text-zinc-600"
        }`}
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>
      {open && (
        <div
          role="group"
          aria-label="서식 더보기"
          className="absolute right-2 top-full z-30 mt-1 grid grid-cols-5 gap-1 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg"
        >
          {items.map(({ key, label, icon: Icon, onClick, active, disabled }) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={Boolean(active)}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={toolbarButtonClass(active, "flex size-10 items-center justify-center")}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
