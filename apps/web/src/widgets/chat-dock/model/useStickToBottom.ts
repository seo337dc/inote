"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "./types";

// 맨 아래에서 이 거리(px) 안이면 "아래를 보고 있다"고 본다
const BOTTOM_THRESHOLD = 80;

// 채팅 목록을 맨 아래로 따라 내려가게 한다.
// - 대화를 새로 열었을 때(첫 메시지가 바뀜)와 내가 보낼 때(isSending이 켜짐)는 무조건 맨 아래로
// - 답변이 스트리밍으로 덧붙는 동안은 아래를 보고 있을 때만 따라간다. 읽으려고 위로 올렸으면
//   멈춘다 (계속 끌어내리면 위 내용을 읽을 수 없다)
export function useStickToBottom(messages: ChatMessage[], isSending: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  function scrollToBottom() {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }

  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  }

  const firstMessageId = messages[0]?.id;
  useEffect(() => {
    stickRef.current = true;
    scrollToBottom();
  }, [firstMessageId]);

  useEffect(() => {
    if (!isSending) return;
    stickRef.current = true;
    scrollToBottom();
  }, [isSending]);

  useEffect(() => {
    if (stickRef.current) scrollToBottom();
  }, [messages]);

  return { containerRef, onScroll };
}
