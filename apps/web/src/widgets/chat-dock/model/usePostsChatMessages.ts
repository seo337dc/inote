"use client";

import { useRef, useState } from "react";
import { askSuggestion, replySuggestion } from "./suggestions";
import type { ChatMessage, ChatSuggestion } from "./types";
import {
  MAX_QUERY_CHARS,
  readPostsChatStream,
  toRequestMessages,
  type PostsChatEvent,
} from "./postsChatStream";

// 글 목록 화면 채팅의 시작 버튼. 버튼별 동작(되묻기·작성 중인 글 안내)은 뒤 단계에서 붙인다.
const POSTS_SUGGESTIONS = [
  askSuggestion("글을 쓰고 싶어"),
  replySuggestion("글을 찾아줘", "어떤 내용을 찾으신가요?\n찾고 싶은 주제나 키워드를 입력해 주세요."),
  askSuggestion("과제나 업무 도와줘"),
];

const MESSAGES = {
  network: "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
  failed: "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.",
  tooLong: `질문은 ${MAX_QUERY_CHARS.toLocaleString("ko-KR")}자까지 입력할 수 있어요.`,
  invalid: "질문을 이해하지 못했어요. 내용을 바꿔서 다시 입력해주세요.",
  interrupted: "\n\n(답변이 중간에 끊겼어요. 다시 시도해주세요.)",
  empty: "답변이 비어 있어요. 질문을 바꿔서 다시 시도해주세요.",
};

// 글 목록 채팅 — inote-ai의 /posts-chat/stream을 씀. 공개 글을 먼저 검색하고 찾은 글을 근거로 답하며(출처를 함께 받음),
// 대화를 DB에 저장하지 않는다(세션 목록·검색 없음). 설계: inote 레포 docs/kure/PLAN.md 6절 D 1차(결정 17).
// useChatMessages()와 "같은 모양"의 객체를 반환해서 ChatComposer/ChatBody/DesktopChatPanel 등 기존 UI를
// 그대로 재사용한다 (useReadingChatMessages와 같은 방식) — 세션 관련 필드는 빈 값/no-op.
export function usePostsChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // 진행 중인 요청 — 새 대화를 시작하면 끊고, 답변이 오는 도중에 또 보내는 것은 막는다
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || abortRef.current) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setInput("");

    // 서버가 거절할 길이는 보내지 않고 바로 알려준다
    if (trimmed.length > MAX_QUERY_CHARS) {
      setMessages([...history, { id: assistantId, role: "assistant", text: MESSAGES.tooLong }]);
      return;
    }
    setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAnswer(history, assistantId, controller.signal);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function streamAnswer(history: ChatMessage[], assistantId: string, signal: AbortSignal) {
    let res: Response;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/posts-chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toRequestMessages(history) }),
        signal,
      });
    } catch {
      if (!signal.aborted) setAssistantText(assistantId, MESSAGES.network);
      return;
    }

    if (!res.ok || !res.body) {
      setAssistantText(assistantId, res.status === 422 ? MESSAGES.invalid : MESSAGES.failed);
      return;
    }

    let received = false;
    let receivedText = false;
    try {
      for await (const event of readPostsChatStream(res.body)) {
        received = true;
        if (event.type === "text" && event.text !== "") receivedText = true;
        applyEvent(assistantId, event);
      }
      // 끝났는데 글자가 하나도 없으면(모델이 빈 답을 준 경우) "조회 중"으로 남지 않게 알려준다
      if (!receivedText) setAssistantText(assistantId, MESSAGES.empty);
    } catch {
      // 직접 끊은 경우(새 대화)는 조용히 끝낸다. 네트워크가 끊긴 경우는 받은 데까지 두고 알려준다.
      if (signal.aborted) return;
      if (received) appendAssistantText(assistantId, MESSAGES.interrupted);
      else setAssistantText(assistantId, MESSAGES.failed);
    }
  }

  function applyEvent(id: string, event: PostsChatEvent) {
    if (event.type === "text") {
      appendAssistantText(id, event.text);
      return;
    }
    // 내 글을 근거로 답했을 때만 출처를 붙인다 (일반 답변이면 sources가 비어 있다)
    if (event.sources.length > 0) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, sources: event.sources } : m)));
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

  function selectSuggestion(suggestion: ChatSuggestion) {
    if (suggestion.action.type === "ask") sendPreset(suggestion.action.text);
    else replyLocally(suggestion.label, suggestion.action.text);
  }

  // 서버를 부르지 않고 안내를 바로 보여준다 (답변이 오는 도중에는 대화가 섞이지 않게 무시)
  function replyLocally(userText: string, assistantText: string) {
    if (abortRef.current) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: userText, local: true },
      { id: crypto.randomUUID(), role: "assistant", text: assistantText, local: true },
    ]);
  }

  function startNewSession() {
    abortRef.current?.abort();
    abortRef.current = null;
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
    selectSuggestion,
    sessions: [],
    activeSessionId: null,
    activeSessionTitle: firstUserMessage || null,
    startNewSession,
    selectSession: () => {},
    isSessionPanelOpen: false,
    toggleSessionPanel: () => {},
    sessionSearch: "",
    setSessionSearch: () => {},
    // 세션 히스토리가 없는 모드라 isLoggedIn을 항상 false로 둬서 "대화 목록" 버튼을 숨긴다 — 실제 로그인 여부와는 무관.
    isLoggedIn: false,
    suggestions: POSTS_SUGGESTIONS,
  };
}
