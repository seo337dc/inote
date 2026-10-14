"use client";

import { useRef, useState } from "react";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";
import { loadWriteGuide } from "./writeGuide";
import { fetchSessionHistory, useChatSessionList } from "./chatSessions";
import { sessionTitle } from "./sessionLabel";
import { replySuggestion } from "./suggestions";
import type { ChatMessage, ChatReply, ChatSession, ChatSuggestion } from "./types";
import {
  MAX_QUERY_CHARS,
  readPostsChatStream,
  toRequestMessages,
  type PostsChatEvent,
} from "./postsChatStream";

// 글 목록 화면 채팅의 시작 버튼은 모두 서버(AI)를 부르지 않고 안내로 먼저 답한다 (설계 결정 17).
// 글을 쓰고 싶어 → 작성 중인 글·새 글 링크 / 글을 찾아줘 → 되묻기(다음 입력이 검색) / 과제나 업무 도와줘 → 되묻기(이후 일반 답변)
const FIND_PROMPT = "어떤 내용을 찾으신가요?\n찾고 싶은 주제나 키워드를 입력해 주세요.";
const TASK_PROMPT = "어떤 과제나 업무인가요?\n자세히 알려주시면 도와드릴게요.";
const fetchMyDrafts = () => api.get<Post[]>("/blog/posts/mine/drafts");

const MESSAGES = {
  network: "AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
  failed: "답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.",
  tooLong: `질문은 ${MAX_QUERY_CHARS.toLocaleString("ko-KR")}자까지 입력할 수 있어요.`,
  invalid: "질문을 이해하지 못했어요. 내용을 바꿔서 다시 입력해주세요.",
  interrupted: "\n\n(답변이 중간에 끊겼어요. 다시 시도해주세요.)",
  empty: "답변이 비어 있어요. 질문을 바꿔서 다시 시도해주세요.",
};

// 글 목록 채팅 — inote-ai의 /posts-chat/stream을 씀. 공개 글을 먼저 검색하고 찾은 글을 근거로 답하며(출처를 함께 받음),
// 로그인했으면 대화를 저장해서(kind="posts") 다른 화면의 대화와 한 히스토리에서 보인다. 게스트는 저장 없이 휘발성.
// 설계: inote 레포 docs/kure/PLAN.md 6절 D 1차(결정 17).
// useChatMessages()와 "같은 모양"의 객체를 반환해서 ChatComposer/ChatBody/DesktopChatPanel 등 기존 UI를 그대로 재사용한다.
export function usePostsChatMessages() {
  const { data: authSession, isPending: isSessionPending } = useSession();
  const userId = authSession?.user.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // 저장되는 대화의 id — 첫 질문을 보낼 때 만들고(로그인했을 때만), 새 대화를 시작하면 비운다
  const [sessionId, setSessionId] = useState<string | null>(null);
  const {
    sessions,
    loadSessions,
    isSessionPanelOpen,
    toggleSessionPanel,
    closeSessionPanel,
    sessionSearch,
    setSessionSearch,
  } = useChatSessionList({ userId, isSessionPending });
  // true면 이 대화는 내 글을 검색하지 않고 일반 답변으로 이어간다 ("과제나 업무 도와줘"를 고른 경우) — 새 대화·다른 대화를 열면 풀린다
  const [searchOff, setSearchOff] = useState(false);
  // 대화를 빠르게 갈아타도 늦게 도착한 이전 대화의 이력이 덮어쓰지 않게 하는 표식
  const historyRequestRef = useRef(0);
  // 진행 중인 요청 — 새 대화를 시작하면 끊고, 답변이 오는 도중에 또 보내는 것은 막는다
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || abortRef.current) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setInput("");

    // 로그인했으면 대화를 저장한다(서버가 user_id·session_id가 둘 다 있을 때만 저장). 게스트는 저장 없음.
    const activeSessionId = userId ? (sessionId ?? crypto.randomUUID()) : null;
    if (activeSessionId && activeSessionId !== sessionId) setSessionId(activeSessionId);

    // 서버가 거절할 길이는 보내지 않고 바로 알려준다
    if (trimmed.length > MAX_QUERY_CHARS) {
      setMessages([...history, { id: assistantId, role: "assistant", text: MESSAGES.tooLong }]);
      return;
    }
    setMessages([...history, { id: assistantId, role: "assistant", text: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAnswer(history, assistantId, controller.signal, activeSessionId);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      // 방금 나눈 대화가 목록에 바로 나타나도록 (저장은 답변이 끝날 때 된다)
      if (activeSessionId) void loadSessions();
    }
  }

  async function streamAnswer(
    history: ChatMessage[],
    assistantId: string,
    signal: AbortSignal,
    activeSessionId: string | null,
  ) {
    let res: Response;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/posts-chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toRequestMessages(history),
          ...(activeSessionId && userId ? { user_id: userId, session_id: activeSessionId } : {}),
          ...(searchOff ? { use_search: false } : {}),
        }),
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
    else void replyLocally(suggestion.label, suggestion.action.reply, !!suggestion.action.searchOff);
  }

  // 서버를 부르지 않고 안내를 바로 보여준다 (답변이 오는 도중에는 대화가 섞이지 않게 무시).
  // 안내를 만드는 데 시간이 걸리면(함수) 그동안 빈 말풍선 = "조회 중"으로 두었다가 채운다.
  async function replyLocally(
    userText: string,
    reply: ChatReply | (() => Promise<ChatReply>),
    turnSearchOff: boolean,
  ) {
    if (abortRef.current) return;
    const assistantId = crypto.randomUUID();
    const immediate = typeof reply === "function" ? null : reply;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: userText, local: true },
      {
        id: assistantId,
        role: "assistant",
        text: immediate?.text ?? "",
        ...(immediate?.links ? { links: immediate.links } : {}),
        local: true,
      },
    ]);
    if (turnSearchOff) setSearchOff(true);
    if (typeof reply !== "function") return;

    let result: ChatReply;
    try {
      result = await reply();
    } catch {
      result = { text: MESSAGES.failed };
    }
    // 그 사이 새 대화를 시작했으면 그 말풍선은 이미 없다 — 아무 일도 일어나지 않는다
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, text: result.text, ...(result.links ? { links: result.links } : {}) } : m)),
    );
  }

  // 진행 중인 답변을 끊고 대화를 비운다 (새 대화·다른 대화로 갈아탈 때)
  function resetConversation() {
    abortRef.current?.abort();
    abortRef.current = null;
    historyRequestRef.current++;
    setMessages([]);
    setInput("");
    setSearchOff(false);
  }

  function startNewSession() {
    resetConversation();
    setSessionId(null);
    closeSessionPanel();
  }

  // 목록에서 고른 대화(어느 화면에서 나눈 것이든)의 저장된 이력을 불러와서 이 화면의 채팅에서 이어간다
  function selectSession(target: ChatSession) {
    resetConversation();
    setSessionId(target.id);
    closeSessionPanel();
    if (!userId) return;
    const request = historyRequestRef.current;
    void fetchSessionHistory(userId, target.id).then((history) => {
      if (historyRequestRef.current === request) setMessages(history ?? []);
    });
  }

  // 헤더 제목 — 목록에 있는 대화는 그 제목, 방금 시작해 아직 목록에 없으면 첫 사용자 메시지
  const currentSession = sessions.find((s) => s.id === sessionId) ?? null;
  const firstUserMessage = messages.find((m) => m.role === "user")?.text.trim();

  // 글 목록 화면의 시작 버튼 — "글을 쓰고 싶어"는 로그인 여부에 따라 안내가 달라서 훅 안에서 만든다
  const suggestions = [
    replySuggestion("글을 쓰고 싶어", () => loadWriteGuide(!!userId, fetchMyDrafts)),
    replySuggestion("글을 찾아줘", FIND_PROMPT),
    replySuggestion("과제나 업무 도와줘", TASK_PROMPT, { searchOff: true }),
  ];

  return {
    messages,
    input,
    setInput,
    handleSend,
    sendPreset,
    selectSuggestion,
    sessions,
    activeSessionId: sessionId,
    activeSessionTitle: (currentSession ? sessionTitle(currentSession) : "") || firstUserMessage || null,
    startNewSession,
    selectSession,
    isSessionPanelOpen,
    toggleSessionPanel,
    sessionSearch,
    setSessionSearch,
    isLoggedIn: !!userId,
    suggestions,
  };
}
