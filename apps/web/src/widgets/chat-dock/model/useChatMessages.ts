"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";
import type { ChatMessage, ChatSession } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL;

export function useChatMessages() {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const userId = authSession?.user.id;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 글쓰기/수정 페이지에 있을 때만 그 글의 postId로 대화 세션을 강제 전환.
  const routePostId = pathname === "/write" ? searchParams.get("id") : null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPostId, setSessionPostId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  // 글쓰기 페이지 진입/이동 시 그 글의 세션으로 강제 전환. 글쓰기 페이지를 벗어나면
  // 다음에 (같은 글이든 다른 글이든) 다시 들어왔을 때 항상 재동기화되도록 리셋.
  const lastRoutePostId = useRef<string | null>(null);
  useEffect(() => {
    if (!routePostId) {
      lastRoutePostId.current = null;
      return;
    }
    if (lastRoutePostId.current === routePostId) return;
    lastRoutePostId.current = routePostId;
    setSessionId(routePostId);
    setSessionPostId(routePostId);
  }, [routePostId]);

  // 로그인 상태에서 아직 활성 세션이 없으면(글쓰기 페이지 강제 전환도 없을 때) 새 일반 세션으로 시작.
  const hasDefaultedSession = useRef(false);
  useEffect(() => {
    if (isSessionPending || !userId || sessionId || hasDefaultedSession.current) return;
    hasDefaultedSession.current = true;
    setSessionId(crypto.randomUUID());
    setSessionPostId(null);
  }, [isSessionPending, userId, sessionId]);

  // 세션 목록(대화 패널용) 로드 — 로그인 상태에서만. query가 있으면 제목/대화 내용 검색.
  const loadSessions = useCallback(
    async (query?: string) => {
      if (!userId) {
        setSessions([]);
        return;
      }
      try {
        const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
        const res = await fetch(
          `${AI_API_URL}/sessions?user_id=${encodeURIComponent(userId)}${qParam}`,
        );
        if (!res.ok) return;
        setSessions((await res.json()) as ChatSession[]);
      } catch {
        // 목록 로드 실패는 조용히 무시 — 채팅 자체는 계속 동작해야 함
      }
    },
    [userId],
  );

  useEffect(() => {
    if (isSessionPending) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 상태 변화에 대한 동기화
    void loadSessions();
  }, [isSessionPending, loadSessions]);

  // 검색어가 바뀌면 잠시(300ms) 기다렸다가 다시 검색 — 패널이 열려 있을 때만.
  useEffect(() => {
    if (!isSessionPanelOpen) return;
    const timer = setTimeout(() => {
      void loadSessions(sessionSearch || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionSearch, isSessionPanelOpen, loadSessions]);

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

    (async () => {
      try {
        const res = await fetch(
          `${AI_API_URL}/conversations/${sessionId}?user_id=${encodeURIComponent(userId)}`,
        );
        if (!res.ok) {
          setMessages([]);
          return;
        }
        const history = (await res.json()) as { role: "user" | "assistant"; content: string }[];
        setMessages(
          history.map((m) => ({ id: crypto.randomUUID(), role: m.role, text: m.content })),
        );
      } catch {
        setMessages([]);
      }
    })();
  }, [sessionId, isSessionPending, userId]);

  function startNewSession() {
    setSessionId(crypto.randomUUID());
    setSessionPostId(null);
    setMessages([]);
    setSessionPanelOpen(false);
    setSessionSearch("");
  }

  function selectSession(target: ChatSession) {
    setSessionId(target.id);
    setSessionPostId(target.post_id);
    setSessionPanelOpen(false);
    setSessionSearch("");
  }

  function toggleSessionPanel() {
    setSessionPanelOpen((v) => !v);
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

  return {
    messages,
    input,
    setInput,
    handleSend,
    sendPreset,
    sessions,
    activeSessionId: sessionId,
    startNewSession,
    selectSession,
    isSessionPanelOpen,
    toggleSessionPanel,
    sessionSearch,
    setSessionSearch,
    isLoggedIn: !!userId,
  };
}
