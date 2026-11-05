"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { initialPanelRect } from "@/shared/lib/floating-rect";

// react-rnd(드래그+리사이즈)는 패널을 처음 열 때만 내려받는다 — 글쓰기 첫 로딩 번들에 안 들어감.
const Rnd = dynamic(() => import("react-rnd").then((m) => m.Rnd), { ssr: false });

const MIN_SIZE = { width: 240, height: 160 };
const DEFAULT_SIZE = { width: 320, height: 360 };
// 화면 오른쪽 아래의 고정 버튼(메모 버튼) 위로 패널이 뜨도록 아래쪽을 더 띄운다.
const BOTTOM_INSET = 64;
const HANDLE_CLASS = "floating-panel-handle";
const CANCEL_CLASS = "floating-panel-cancel";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** 열기 버튼 같은 기준 요소의 오른쪽·위쪽 끝(뷰포트 좌표). 주면 그 바로 위에 뜬다. */
  anchor?: { right: number; top: number };
};

/**
 * 화면 위를 떠다니는 패널: 헤더를 잡고 이동, 가장자리를 잡고 크기 조절.
 * 내용(children)이 뭔지는 모른다 — 메모 말고 다른 곳에서도 재사용하려는 목적.
 * 위치·크기는 저장하지 않는다(열 때마다 기준 요소 위, 없으면 오른쪽 아래 기본값). 닫혀도 children의 상태는
 * 부모가 들고 있으므로 입력 내용은 유지된다.
 */
export function FloatingPanel({ open, onClose, title, children, anchor }: Props) {
  if (!open) return null;
  return (
    <OpenPanel onClose={onClose} title={title} anchor={anchor}>
      {children}
    </OpenPanel>
  );
}

function OpenPanel({ onClose, title, children, anchor }: Omit<Props, "open">) {
  // 열린 상태에서만 마운트되므로(클라이언트 상호작용 뒤) window를 안전하게 읽을 수 있다.
  const [rect] = useState(() =>
    initialPanelRect(
      { width: window.innerWidth, height: window.innerHeight },
      DEFAULT_SIZE,
      { min: MIN_SIZE, bottomInset: BOTTOM_INSET, anchor },
    ),
  );

  // body로 포털 — 부모(sticky 바 등)의 쌓임 맥락에 갇혀 다른 패널 아래로 가려지는 것을 막는다.
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50">
      <Rnd
        default={rect}
        minWidth={MIN_SIZE.width}
        minHeight={MIN_SIZE.height}
        bounds="parent"
        dragHandleClassName={HANDLE_CLASS}
        cancel={`.${CANCEL_CLASS}`}
        className="pointer-events-auto"
      >
        <section
          role="dialog"
          aria-label={title}
          className="bg-memo text-memo-foreground border-memo-border flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-lg"
        >
          <header
            className={`${HANDLE_CLASS} bg-memo-header border-memo-border flex shrink-0 cursor-move items-center justify-between border-b px-3 py-2 select-none`}
          >
            <span className="text-sm font-medium">{title}</span>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className={`${CANCEL_CLASS} text-memo-muted hover:bg-memo-border/60 hover:text-memo-foreground cursor-pointer rounded p-1 transition-colors`}
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </section>
      </Rnd>
    </div>,
    document.body,
  );
}
