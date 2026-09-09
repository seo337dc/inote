"use client";

import { X } from "lucide-react";
import ChatMessages from "./ChatMessages";
import ChatComposer from "./ChatComposer";
import type { useChatMessages } from "../model/useChatMessages";

type Props = {
  open: boolean;
  onClose: () => void;
  chat: ReturnType<typeof useChatMessages>;
};

export default function ChatPanel({ open, onClose, chat }: Props) {
  return (
    <div className="lg:hidden">
      <div
        className={`fixed inset-0 z-10 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-0 z-20 flex h-[90vh] flex-col rounded-t-lg border
          border-zinc-200 bg-white shadow-lg transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}`}
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

        <ChatMessages messages={chat.messages} />
        <ChatComposer input={chat.input} onInputChange={chat.setInput} onSubmit={chat.handleSend} />
      </div>
    </div>
  );
}
