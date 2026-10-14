"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";
import { getRoutePostIds } from "./routePost";
import { fetchSessionHistory, useChatSessionList } from "./chatSessions";
import { sessionTitle } from "./sessionLabel";
import { askSuggestion } from "./suggestions";
import type { ChatMessage, ChatSession, ChatSuggestion } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL;

const WRITE_SUGGESTIONS = ["글을 쓰고 싶어", "과제를 도와줘", "어떤 글을 쓸까?"].map((l) => askSuggestion(l));

export function useChatMessages() {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const userId = authSession?.user.id;
  const pathname = usePathname();
  // 글쓰기/수정 페이지에 있을 때만 그 글의 postId로 대화 세션을 강제 전환.
  const { routePostId, detailPostId } = getRoutePostIds(pathname);
  // 글 상세 페이지에서는, 그 글에 이미 나눈 대화가 있을 때만 그 세션으로 전환 (없으면 그대로 둠).

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPostId, setSessionPostId] = useState<string | null>(null);
  const {
    sessions,
    loadSessions,
    isSessionPanelOpen,
    toggleSessionPanel,
    closeSessionPanel,
    sessionSearch,
    setSessionSearch,
  } = useChatSessionList({ userId, isSessionPending });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // 글쓰기 페이지 진입/이동 시 그 글의 세션으로 강제 전환. 글쓰기 페이지를 벗어나면
  // 다음에 (같은 글이든 다른 글이든) 다시 들어왔을 때 항상 재동기화되도록 리셋.
  // 글 상세 페이지는 그 글에 이미 나눈 대화가 있을 때만(sessions 목록에서 찾아서) 전환한다 —
  // 없으면 그냥 글만 읽으러 온 것일 수 있으니 활성 세션을 건드리지 않음.
  const lastRoutePostId = useRef<string | null>(null);
  useEffect(() => {
    if (routePostId) {
      if (lastRoutePostId.current === routePostId) return;
      lastRoutePostId.current = routePostId;
      setSessionId(routePostId);
      setSessionPostId(routePostId);
      return;
    }

    if (detailPostId) {
      if (lastRoutePostId.current === detailPostId) return;
      const existing = sessions.find((s) => s.post_id === detailPostId);
      if (!existing) return;
      lastRoutePostId.current = detailPostId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 상세 페이지 진입에 대한 동기화
      setSessionId(existing.id);
      setSessionPostId(existing.post_id);
      return;
    }

    lastRoutePostId.current = null;
  }, [routePostId, detailPostId, sessions]);

  // 로그인 상태에서 아직 활성 세션이 없으면(글쓰기 페이지 강제 전환도 없을 때) 새 일반 세션으로 시작.
  const hasDefaultedSession = useRef(false);
  useEffect(() => {
    if (isSessionPending || !userId || sessionId || hasDefaultedSession.current) return;
    hasDefaultedSession.current = true;
    setSessionId(crypto.randomUUID());
    setSessionPostId(null);
  }, [isSessionPending, userId, sessionId]);

  // 활성 세션이 바뀌면 그 대화 이력을 불러옴.
  const loadedSessionId = useRef<string | null>(null);
  useEffect(() => {
    if (isSessionPending) return;
    if (loadedSessionId.current === sessionId) return;
    loadedSessionId.current = sessionId;

    if (!sessionId || !userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 세션 전환에 대한 동기화 리셋
      setMessages([]);
      return;
    }

    void fetchSessionHistory(userId, sessionId).then((history) => setMessages(history ?? []));
  }, [sessionId, isSessionPending, userId]);

  function startNewSession() {
    setSessionId(crypto.randomUUID());
    setSessionPostId(null);
    setMessages([]);
    closeSessionPanel();
  }

  function selectSession(target: ChatSession) {
    setSessionId(target.id);
    setSessionPostId(target.post_id);
    closeSessionPanel();
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");

    // 로그인 안 한 게스트는 세션 없이 그냥 휘발성 채팅 (저장 안 됨)
    const activeSessionId = userId ? (sessionId ?? crypto.randomUUID()) : null;
    if (userId && !sessionId) setSessionId(activeSessionId);

    // 글쓰기 세션이면 보낼 때마다 그 글의 실시간 제목/카테고리를 새로 가져옴
    // (자동저장으로 방금 바뀐 제목도 놓치지 않도록 — 세션 전환 시점에 한 번만 캐싱하지 않음)
    let postMeta: { title: string; category: string } | null = null;
    if (sessionPostId) {
      try {
        const post = await api.get<Post>(`/blog/posts/${sessionPostId}`);
        postMeta = { title: post.title, category: post.category };
      } catch {
        postMeta = null;
      }
    }

    let res: Response;
    try {
      res = await fetch(`${AI_API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId ?? "guest",
          session_id: activeSessionId,
          post_id: sessionPostId,
          post_title: postMeta?.title,
          post_category: postMeta?.category,
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
    let receivedText = false;

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
        if (text) receivedText = true;
        appendAssistantText(assistantId, text);
      }
    }

    // 끝났는데 글자가 하나도 없으면(모델이 빈 답을 준 경우) "조회 중"으로 남지 않게 알려준다
    if (!receivedText) setAssistantText(assistantId, "답변이 비어 있어요. 질문을 바꿔서 다시 시도해주세요.");

    if (userId) void loadSessions();
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
  }

  // 상단 헤더에 보여줄 현재 세션 제목. 세션 목록에 아직 없는(방금 시작한) 대화는
  // 첫 사용자 메시지로 대신 보여준다 — 응답을 기다리지 않고 바로 제목이 잡히도록.
  const currentSession = sessions.find((s) => s.id === sessionId) ?? null;
  const firstUserMessage = messages.find((m) => m.role === "user")?.text.trim();
  const activeSessionTitle = (currentSession ? sessionTitle(currentSession) : "") || firstUserMessage || null;

  return {
    messages,
    input,
    setInput,
    handleSend,
    sendPreset,
    selectSuggestion,
    sessions,
    activeSessionId: sessionId,
    activeSessionTitle,
    startNewSession,
    selectSession,
    isSessionPanelOpen,
    toggleSessionPanel,
    sessionSearch,
    setSessionSearch,
    isLoggedIn: !!userId,
    suggestions: WRITE_SUGGESTIONS,
  };
}
