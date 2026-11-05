"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

// globals.css의 .memo-sheet-* 애니메이션 길이와 같아야 한다.
const CLOSE_MS = 300;

/**
 * 좁은 화면(모바일·태블릿)에서 메모를 쓰는 하단 패널 — AI 모바일 패널처럼 아래에서 위로 올라오고,
 * 닫을 때는 내려간 뒤 사라진다. 바깥(어두운 영역)을 누르면 닫힌다.
 * 데스크톱의 떠다니는 패널은 FloatingPanel.
 */
export function MemoBottomSheet({ open, onClose, title, children }: Props) {
  const [closing, setClosing] = useState(false);

  // 부모가 직접 닫은 경우(예: 화면 폭이 바뀌어 다른 패널로 교체)에는 내려가는 애니메이션 없이 정리한다.
  if (!open && closing) setClosing(false);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  if (!open) return null;

  const requestClose = () => setClosing(true);

  return createPortal(
    <div className="fixed inset-0 z-30">
      <div
        className={`absolute inset-0 bg-black/30 ${closing ? "memo-overlay-out" : "memo-overlay-in"}`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-label={title}
        className={`bg-memo text-memo-foreground border-memo-border absolute inset-x-0 bottom-0 flex h-[60dvh] flex-col overflow-hidden rounded-t-lg border-t shadow-lg ${
          closing ? "memo-sheet-out" : "memo-sheet-in"
        }`}
      >
        <header className="bg-memo-header border-memo-border flex shrink-0 items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-medium">{title}</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={requestClose}
            className="text-memo-muted hover:bg-memo-border/60 hover:text-memo-foreground cursor-pointer rounded p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
