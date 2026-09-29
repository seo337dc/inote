"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Settings, Sparkles } from "lucide-react";

type Props = {
  summary: string[];
  // 수정 화면처럼 "지금 보이는 요약이 어떤 상태인지" 안내가 필요할 때
  hint?: string;
  // 있으면 제목 옆에 설정(⚙) 아이콘이 생기고, 누르면 "AI 다시 요약하기" 메뉴가 열린다 (작성자용)
  onResummarize?: () => void;
  resummarizing?: boolean;
};

export default function PostAiSummary({ summary, hint, onResummarize, resummarizing }: Props) {
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="flex items-center text-sm font-medium text-zinc-700">
        <button type="button" onClick={toggle} className="flex items-center gap-1.5">
          <Sparkles className="size-4" />
          AI 개요
        </button>
        {onResummarize && (
          <div ref={menuRef} className="relative ml-1.5 flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="AI 개요 설정"
              aria-expanded={menuOpen}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
            >
              <Settings className="size-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute left-full top-1/2 z-10 ml-1 -translate-y-1/2">
                <button
                  type="button"
                  disabled={resummarizing}
                  onClick={() => {
                    setMenuOpen(false);
                    onResummarize();
                  }}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-normal text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  <RefreshCw className="size-3.5" />
                  AI 다시 요약하기
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "AI 개요 접기" : "AI 개요 펼치기"}
          className="flex flex-1 justify-end"
        >
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {open && hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
      {open && resummarizing && (
        <p className="mt-2 text-sm text-zinc-400">AI가 다시 요약하고 있어요…</p>
      )}
      {open && !resummarizing && summary.length === 0 && (
        <p className="mt-2 text-sm text-zinc-400">아직 요약이 없어요.</p>
      )}
      {open && !resummarizing && summary.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-600">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
