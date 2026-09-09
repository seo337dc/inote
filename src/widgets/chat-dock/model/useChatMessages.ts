"use client";

import { useState } from "react";
import type { ChatMessage } from "./types";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "무엇을 도와드릴까요? (아직 실제 응답은 연결 전이에요 — Phase 2에서 inote-ai와 연동 예정)",
};

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setInput("");
  }

  return { messages, input, setInput, handleSend };
}
