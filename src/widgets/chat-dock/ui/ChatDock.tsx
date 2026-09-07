"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import ChatPanel from "./ChatPanel";

export default function ChatDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="AI 어시스턴트 열기"
        className={`fixed bottom-4 right-4 z-20 flex size-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-opacity hover:bg-zinc-800 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <MessageCircle className="size-5" />
      </button>

      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
