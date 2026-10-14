"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, ChatSession, ChatSource } from "./types";

// 채팅 모드(글쓰기·글 찾기·독서·할 일…)가 함께 쓰는 "대화 히스토리" 부분 — 목록·검색·패널 열림·이력 불러오기.
// 모드마다 따로 만들면 목록이 어긋나므로 여기 한 곳에 둔다. 목록은 모든 모드의 대화를 섞어 보여주고(ChatSession.kind로 구분),
// 어느 대화를 열든 지금 화면의 채팅에서 이어갈 수 있다.

const SEARCH_DELAY_MS = 300;

/** 대화 목록 — 로그인 상태에서만 불러온다. 패널이 열려 있고 검색어가 바뀌면 잠시 기다렸다가 다시 검색한다. */
export function useChatSessionList({ userId, isSessionPending }: { userId?: string; isSessionPending: boolean }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");

  const loadSessions = useCallback(
    async (query?: string) => {
      if (!userId) {
        setSessions([]);
        return;
      }
      try {
        const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
        const res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/sessions?user_id=${encodeURIComponent(userId)}${qParam}`);
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

  useEffect(() => {
    if (!isSessionPanelOpen) return;
    const timer = setTimeout(() => {
      void loadSessions(sessionSearch || undefined);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sessionSearch, isSessionPanelOpen, loadSessions]);

  function toggleSessionPanel() {
    setSessionPanelOpen((v) => !v);
  }

  /** 대화를 고르거나 새로 시작한 뒤: 패널을 닫고 검색어를 비운다 */
  function closeSessionPanel() {
    setSessionPanelOpen(false);
    setSessionSearch("");
  }

  return {
    sessions,
    loadSessions,
    isSessionPanelOpen,
    toggleSessionPanel,
    closeSessionPanel,
    sessionSearch,
    setSessionSearch,
  };
}

type HistoryItem = { role: "user" | "assistant"; content: string; sources?: ChatSource[] };

/** 한 대화의 저장된 이력 — 못 불러오면 null(호출하는 쪽이 빈 대화로 둔다). 글 찾기 답변은 출처 카드도 함께 복원한다. */
export async function fetchSessionHistory(userId: string, sessionId: string): Promise<ChatMessage[] | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/conversations/${sessionId}?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const history = (await res.json()) as HistoryItem[];
    return history.map((m) => ({
      id: crypto.randomUUID(),
      role: m.role,
      text: m.content,
      ...(m.sources && m.sources.length > 0 ? { sources: m.sources } : {}),
    }));
  } catch {
    return null;
  }
}
