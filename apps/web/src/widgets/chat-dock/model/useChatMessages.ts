"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import { AI_API_URL } from "@/shared/lib/ai-url";
import type { Post } from "@/entities/post";
import { getRoutePostIds } from "./routePost";
import type { ChatMessage, ChatSession } from "./types";

const WRITE_SUGGESTIONS = ["글을 쓰고 싶어", "과제를 도와줘", "어떤 글을 쓸까?"];

// 로그인 안 한 게스트는 세션 id가 없어서 이 키로 메시지를 보관한다
const GUEST_KEY = "guest";
const NO_MESSAGES: ChatMessage[] = [];

export function useChatMessages() {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const userId = authSession?.user.id;
  const pathname = usePathname();
  // 글쓰기/수정 페이지에 있을 때만 그 글의 postId로 대화 세션을 강제 전환.
  const { routePostId, detailPostId } = getRoutePostIds(pathname);
  // 글 상세 페이지에서는, 그 글에 이미 나눈 대화가 있을 때만 그 세션으로 전환 (없으면 그대로 둠).

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPostId, setSessionPostId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  // 메시지·전송 상태는 세션별로 보관한다 — 한 세션의 답변이 진행 중이어도 다른 세션으로 옮겨
  // 새 대화를 보낼 수 있고, 진행 중인 답변은 화면을 떠나도 자기 세션에 계속 쌓인다.
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [sendingKeys, setSendingKeys] = useState<ReadonlySet<string>>(new Set());
  // state는 화면(로딩·버튼 비활성)용이고, 같은 틱에 두 번 눌리는 경우와 비동기 콜백에서 최신 값을 보는 데는 ref를 쓴다.
  const sendingRef = useRef(new Set<string>());

  const activeKey = sessionId ?? GUEST_KEY;
  const messages = messagesBySession[activeKey] ?? NO_MESSAGES;
  const isSending = sendingKeys.has(activeKey);

  const setSessionMessages = useCallback((key: string, next: ChatMessage[]) => {
    setMessagesBySession((prev) => ({ ...prev, [key]: next }));
  }, []);

  const updateSessionMessages = useCallback(
    (key: string, update: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesBySession((prev) => ({ ...prev, [key]: update(prev[key] ?? NO_MESSAGES) }));
    },
    [],
  );

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
      setSessionMessages(sessionId ?? GUEST_KEY, []);
      return;
    }

    // 답변이 진행 중인 세션은 서버 이력으로 덮어쓰지 않는다 — 서버는 답변이 끝나야 저장하므로
    // 지금 불러오면 화면에 쌓이고 있는 답이 사라진다. 이력 응답을 기다리는 사이에 전송이 시작된 경우도 같다.
    if (sendingRef.current.has(sessionId)) return;

    (async () => {
      let history: ChatMessage[] = [];
      try {
        const res = await fetch(
          `${AI_API_URL}/conversations/${sessionId}?user_id=${encodeURIComponent(userId)}`,
        );
        if (res.ok) {
          const rows = (await res.json()) as { role: "user" | "assistant"; content: string }[];
          history = rows.map((m) => ({ id: crypto.randomUUID(), role: m.role, text: m.content }));
        }
      } catch {
        // 이력을 못 불러오면 빈 대화로 시작
      }
      if (sendingRef.current.has(sessionId)) return;
      setSessionMessages(sessionId, history);
    })();
  }, [sessionId, isSessionPending, userId, setSessionMessages]);

  function startNewSession() {
    setSessionId(crypto.randomUUID());
    setSessionPostId(null);
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

  // 같은 세션에서는 답변이 끝날 때까지 다음 전송을 막는다 — 막지 않으면 두 답변이 섞여 들어온다.
  // 다른 세션의 답변이 진행 중인 것은 막지 않는다 (세션별로 따로 쌓인다).
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    // 로그인 안 한 게스트는 세션 없이 그냥 휘발성 채팅 (저장 안 됨)
    const activeSessionId = userId ? (sessionId ?? crypto.randomUUID()) : null;
    const key = activeSessionId ?? GUEST_KEY;
    if (!trimmed || sendingRef.current.has(key)) return;

    sendingRef.current.add(key);
    setSendingKeys(new Set(sendingRef.current));
    try {
      await streamReply(trimmed, activeSessionId, key);
    } finally {
      sendingRef.current.delete(key);
      setSendingKeys(new Set(sendingRef.current));
    }
  }

  async function streamReply(trimmed: string, activeSessionId: string | null, key: string) {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setSessionMessages(key, [...history, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");

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
      setAssistantText(key, assistantId, "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!res.ok || !res.body) {
      setAssistantText(key, assistantId, "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.");
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
        appendAssistantText(key, assistantId, text);
      }
    }

    if (userId) void loadSessions();
  }

  function setAssistantText(key: string, id: string, text: string) {
    updateSessionMessages(key, (prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
  }

  function appendAssistantText(key: string, id: string, text: string) {
    updateSessionMessages(key, (prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)),
    );
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function sendPreset(text: string) {
    void sendMessage(text);
  }

  // 상단 헤더에 보여줄 현재 세션 제목. 세션 목록에 아직 없는(방금 시작한) 대화는
  // 첫 사용자 메시지로 대신 보여준다 — 응답을 기다리지 않고 바로 제목이 잡히도록.
  const currentSession = sessions.find((s) => s.id === sessionId) ?? null;
  const firstUserMessage = messages.find((m) => m.role === "user")?.text.trim();
  const activeSessionTitle =
    (currentSession?.post_id
      ? currentSession.post_title?.trim()
      : currentSession?.last_message?.trim()) ||
    firstUserMessage ||
    null;

  return {
    messages,
    input,
    setInput,
    isSending,
    // 답변이 진행 중인 세션 id (다른 세션을 보고 있어도 포함) — 대화 목록의 "답변 중" 점에 쓴다
    answeringSessionIds: sendingKeys,
    handleSend,
    sendPreset,
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
