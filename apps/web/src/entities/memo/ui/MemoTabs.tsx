"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { FLOATING_PANEL_CANCEL_CLASS as CANCEL } from "@/shared/ui/floating-panel";
import { MEMO_MAX_COUNT, MEMO_TITLE_MAX_LENGTH } from "../model/constants";

type Props = {
  tabs: { key: string; label: string; id: string | null; title: string; content: string }[];
  activeIndex: number;
  canAdd: boolean;
  disabled: boolean;
  error: string | null;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onTitleChange: (title: string) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
};

const ADD_BUTTON =
  "text-memo-muted hover:bg-memo-border hover:text-memo-foreground mb-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * 메모 탭 줄 — 크롬 탭처럼 패널 헤더 자리에 놓인다.
 * - 탭 클릭: 그 메모 열기 / 더블클릭: 제목 고치기(Enter·바깥 클릭·Esc로 끝, 비우면 "메모 N") / 탭의 ×: 삭제
 * - 순서: 탭을 끌어서 옮긴다(데스크톱). 탭에 포커스를 두고 Alt+←/→로도 옮길 수 있다.
 * - 폭이 모자라 다 보이지 않는 탭은 "N" 뱃지로 모이고, 누르면 목록에서 골라 연다(고른 탭은 보이는 자리로 스크롤된다).
 * - +는 오른쪽에 고정되고, 상한(10장)이면 막힌다.
 * 상태는 모른다 — useMemoDraft가 주는 값과 동작을 그대로 받는다.
 */
export function MemoTabs({ tabs, activeIndex, canAdd, disabled, error, onSelect, onAdd, onTitleChange, onRemove, onMove }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const limitReached = tabs.length >= MEMO_MAX_COUNT;
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [hiddenIdx, setHiddenIdx] = useState<number[]>([]); // 폭이 모자라 (일부라도) 잘린 탭
  const [menuOpen, setMenuOpen] = useState(false);
  const tabKeys = tabs.map((t) => t.key).join(",");

  // 어떤 탭이 잘려 있는지 — 탭 줄 안에서 완전히 보이는지를 IntersectionObserver로 지켜본다(스크롤·폭 변화 포함).
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    const els = Array.from(list.children);
    const visible = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target, e.intersectionRatio >= 0.99);
        setHiddenIdx(els.flatMap((el, i) => (visible.get(el) === false ? [i] : [])));
      },
      // 여유를 둔다 — 세로는 활성 탭의 -mb-px 때문에 다른 탭이 1px 어긋나 있어도, 가로는 소수 픽셀 반올림 때문에 "잘렸다"로 세지 않게
      { root: list, rootMargin: "8px 2px 8px 2px", threshold: [0, 0.99, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabKeys]);

  // 열려 있는 탭이 잘려 있으면 보이는 자리로 옮긴다(목록에서 골랐을 때·탭을 추가했을 때)
  useEffect(() => {
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }, [activeIndex, tabKeys]);

  // 목록은 바깥을 누르거나 Esc로 닫는다
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function remove(index: number) {
    const tab = tabs[index];
    // 내용이 있는 메모만 되묻는다 — 빈 메모는 크롬 탭처럼 바로 닫는다
    if (tab.content !== "" && !window.confirm("이 메모를 삭제할까요? 되돌릴 수 없습니다.")) return;
    onRemove(index);
  }

  return (
    <div>
      <div className="flex items-end gap-1">
        <div ref={listRef} role="tablist" aria-label="메모 목록" className="flex min-w-0 items-end gap-0.5 overflow-hidden">
          {tabs.map((tab, i) => {
            const active = i === activeIndex;
            const saved = tab.id !== null; // 서버에 만들어진 메모만 지우고 옮길 수 있다
            const editing = editingKey === tab.key && active;
            return (
              <div
                key={tab.key}
                role="tab"
                aria-selected={active}
                tabIndex={disabled ? -1 : 0}
                draggable={saved && !disabled && !editing}
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => dragFrom !== null && e.preventDefault()}
                onDrop={() => {
                  if (dragFrom !== null) onMove(dragFrom, i);
                  setDragFrom(null);
                }}
                onDragEnd={() => setDragFrom(null)}
                onClick={() => !disabled && onSelect(i)}
                onDoubleClick={() => {
                  if (disabled) return;
                  onSelect(i);
                  setEditingKey(tab.key);
                }}
                onKeyDown={(e) => {
                  if (editing || disabled) return;
                  if (e.altKey && e.key === "ArrowLeft") onMove(i, i - 1);
                  else if (e.altKey && e.key === "ArrowRight") onMove(i, i + 1);
                  else if (e.key === "Enter" || e.key === " ") onSelect(i);
                  else return;
                  e.preventDefault();
                }}
                className={`${CANCEL} group flex max-w-36 shrink-0 cursor-pointer items-center gap-1 rounded-t-md border border-b-0 py-1.5 pr-1 pl-2.5 text-xs transition-colors outline-none focus-visible:ring-1 focus-visible:ring-current ${
                  active
                    ? "bg-memo border-memo-border text-memo-foreground -mb-px font-semibold"
                    : "text-memo-muted hover:bg-memo-header/60 border-transparent hover:brightness-95"
                } ${dragFrom === i ? "opacity-50" : ""}`}
              >
                {editing ? (
                  <input
                    autoFocus
                    value={tab.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingKey(null);
                      e.stopPropagation();
                    }}
                    maxLength={MEMO_TITLE_MAX_LENGTH}
                    placeholder={`메모 ${i + 1}`}
                    aria-label="메모 제목"
                    className="w-24 bg-transparent outline-none"
                  />
                ) : (
                  <span className="truncate" title={tab.label}>
                    {tab.label}
                  </span>
                )}
                {saved && (
                  <button
                    type="button"
                    aria-label={`${tab.label} 삭제`}
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(i);
                    }}
                    className="text-memo-muted hover:bg-memo-border hover:text-memo-foreground flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {hiddenIdx.length > 0 && (
          <div ref={menuRef} className="relative mb-1 shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`안 보이는 메모 ${hiddenIdx.length}개 보기`}
              onClick={() => setMenuOpen((o) => !o)}
              className={`${CANCEL} bg-memo-border text-memo-foreground hover:brightness-95 flex h-6 cursor-pointer items-center gap-0.5 rounded-full pr-1.5 pl-2 text-xs font-medium transition`}
            >
              {hiddenIdx.length}
              <ChevronDown className="size-3" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="안 보이는 메모"
                className={`${CANCEL} bg-memo border-memo-border absolute top-full right-0 z-10 mt-1 max-h-48 w-44 overflow-y-auto rounded-md border py-1 shadow-lg`}
              >
                {hiddenIdx.map((i) => (
                  <button
                    key={tabs[i].key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelect(i);
                      setMenuOpen(false);
                    }}
                    className="text-memo-foreground hover:bg-memo-header block w-full cursor-pointer truncate px-3 py-1.5 text-left text-xs transition-colors"
                  >
                    {tabs[i].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled || !canAdd}
          aria-label="메모 추가"
          title={limitReached ? `메모는 최대 ${MEMO_MAX_COUNT}장까지 만들 수 있습니다` : "메모 추가"}
          className={`${CANCEL} ${ADD_BUTTON}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      {error && (
        <p role="alert" className="px-3 py-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
