"use client";

import { X } from "lucide-react";
import ChatBody from "./ChatBody";
import ChatComposer from "./ChatComposer";
import ChatSessionPanel from "./ChatSessionPanel";
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

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatBody chat={chat} />
            <ChatComposer chat={chat} />
          </div>
          <div
            aria-hidden={!chat.isSessionPanelOpen}
            className={`absolute inset-0 flex flex-col bg-white transition-transform duration-300 ease-out ${
              chat.isSessionPanelOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <ChatSessionPanel chat={chat} />
          </div>
        </div>
      </div>
    </div>
  );
}
