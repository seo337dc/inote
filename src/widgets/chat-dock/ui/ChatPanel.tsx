"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import type { ChatMessage } from "../model/types";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "무엇을 도와드릴까요? (아직 실제 응답은 연결 전이에요 — Phase 2에서 inote-ai와 연동 예정)",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatPanel({ open, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
  }

  return (
    <>
      {/* 모바일 하단 시트일 때만 배경 딤 처리 — 데스크톱은 글 쓰면서 같이 보는 용도라 안 덮음 */}
      <div
        className={`fixed inset-0 z-10 bg-black/30 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-20 flex h-[90vh] flex-col rounded-t-lg border
          border-zinc-200 bg-white shadow-lg transition-transform duration-300 ease-out
          lg:inset-x-auto lg:inset-y-16 lg:right-4 lg:h-auto lg:w-96 lg:rounded-lg
          ${
            open
              ? "translate-y-0 lg:translate-x-0"
              : "translate-y-full lg:translate-y-0 lg:translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <p className="text-sm font-semibold">AI 어시스턴트</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-zinc-200 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="보내기"
            className="rounded bg-zinc-900 p-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </>
  );
}
