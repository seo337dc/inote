"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelRightOpen } from "lucide-react";
import ChatMessages from "./ChatMessages";
import ChatComposer from "./ChatComposer";
import type { useChatMessages } from "../model/useChatMessages";

const WIDTH_KEY = "inote-blog:llm-panel-width";
const COLLAPSED_KEY = "inote-blog:llm-panel-collapsed";
const DEFAULT_WIDTH = 384;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const COLLAPSE_THRESHOLD = MIN_WIDTH - 40;

type Props = {
  chat: ReturnType<typeof useChatMessages>;
};

export default function DesktopChatPanel({ chat }: Props) {
  const pathname = usePathname();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const hydratedRef = useRef(false);
  const draggingRef = useRef(false);

  // localStorage는 서버에 없는 값이라 SSR 결과와 다를 수 있음 — 마운트 후 한 번만 클라이언트
  // 값으로 맞춰준다 (숨겨진 lg: 패널의 픽셀 폭/접힘 여부라 순간적인 하이드레이션 불일치가
  // 화면에 보이지 않아 안전함).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedWidth = Number(window.localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(storedWidth) && storedWidth > 0) {
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, storedWidth)));
    }
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    hydratedRef.current = true;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  if (pathname === "/login") return null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const next = window.innerWidth - e.clientX;
    if (next < COLLAPSE_THRESHOLD) {
      setCollapsed(true);
      return;
    }
    setCollapsed(false);
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  if (collapsed) {
    return (
      <div className="hidden shrink-0 border-l border-zinc-200 bg-zinc-50 lg:flex lg:w-10 lg:flex-col lg:items-center lg:py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="AI 어시스턴트 펼치기"
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <PanelRightOpen className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative hidden shrink-0 lg:flex" style={{ width }}>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="separator"
        aria-orientation="vertical"
        aria-label="AI 어시스턴트 패널 너비 조절"
        className="absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center"
      >
        <div className="h-8 w-1 rounded-full bg-zinc-200" />
      </div>

      <div className="flex w-full flex-col border-l border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold">AI 어시스턴트</p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="AI 어시스턴트 접기"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <PanelRightOpen className="size-4 rotate-180" />
          </button>
        </div>

        <ChatMessages messages={chat.messages} />
        <ChatComposer input={chat.input} onInputChange={chat.setInput} onSubmit={chat.handleSend} />
      </div>
    </div>
  );
}
