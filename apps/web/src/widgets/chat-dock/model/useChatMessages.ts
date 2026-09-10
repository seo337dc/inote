"use client";

import { useState } from "react";
import type { ChatMessage } from "./types";

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setInput("");
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function sendPreset(text: string) {
    sendMessage(text);
  }

  return { messages, input, setInput, handleSend, sendPreset };
}
