"use client";

import { useState } from "react";
import type { ChatMessage } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL;

const READING_SUGGESTIONS = ["이번 달 베스트셀러 알려줘", "책 추천해줘", "이 책 가격이 궁금해"];

// 독서 상담 채팅 — inote-ai의 /reading-chat/stream을 씀. 대화를 DB에 저장하지 않고
// (세션 목록·검색 없음), 그때그때 휘발성으로 주고받는 훨씬 단순한 버전.
// useChatMessages()와 "같은 모양"의 객체를 반환해서, ChatComposer/ChatBody/
// DesktopChatPanel 등 기존 UI 컴포넌트를 코드 수정 없이 그대로 재사용한다 —
// 세션 관련 필드(sessions/selectSession 등)는 전부 빈 값/no-op으로만 채움.
export function useReadingChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");

    let res: Response;
    try {
      res = await fetch(`${AI_API_URL}/reading-chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
    } catch {
      setAssistantText(assistantId, "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!res.ok || !res.body) {
      setAssistantText(assistantId, "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const payload = chunk.replace(/^data: /, "");
        if (!payload || payload === "[DONE]") continue;
        const { text } = JSON.parse(payload) as { text: string };
        appendAssistantText(assistantId, text);
      }
    }
  }

  function setAssistantText(id: string, text: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  function appendAssistantText(id: string, text: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function sendPreset(text: string) {
    void sendMessage(text);
  }

  function startNewSession() {
    setMessages([]);
    setInput("");
  }

  // 세션 저장이 없으니, 첫 사용자 메시지로 헤더 제목만 흉내낸다 (없으면 기본 타이틀 유지).
  const firstUserMessage = messages.find((m) => m.role === "user")?.text.trim();

  return {
    messages,
    input,
    setInput,
    handleSend,
    sendPreset,
    sessions: [],
    activeSessionId: null,
    activeSessionTitle: firstUserMessage || null,
    startNewSession,
    selectSession: () => {},
    isSessionPanelOpen: false,
    toggleSessionPanel: () => {},
    sessionSearch: "",
    setSessionSearch: () => {},
    // 세션 히스토리 자체가 없는 모드라 isLoggedIn을 항상 false로 둬서, ChatComposer의
    // "대화 목록" 버튼(이 필드의 유일한 소비처)을 숨긴다 — 실제 로그인 여부와는 무관.
    isLoggedIn: false,
    suggestions: READING_SUGGESTIONS,
  };
}
