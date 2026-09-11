"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/shared/lib/auth-client";
import type { ChatMessage } from "./types";

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL;

export function useChatMessages() {
  const { data: session, isPending: isSessionPending } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 글쓰기/수정 페이지(post_id 있음)에서만 대화가 그 글에 묶여 저장·복원됨.
  // 그 외 페이지에서는 지금처럼 저장 없이 대화만 오가는 일반 어시스턴트.
  const postId = pathname === "/write" ? searchParams.get("id") : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const loadedPostId = useRef<string | null>(null);
  useEffect(() => {
    // 세션이 아직 로딩 중이면 본인 글인지 판단 못 하니 기다림 (섣불리 빈 상태로 확정 안 함)
    if (isSessionPending) return;
    if (loadedPostId.current === postId) return;
    loadedPostId.current = postId;

    const userId = session?.user.id;
    if (!postId || !userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 경로 변경에 대한 동기화 리셋
      setMessages([]);
      return;
    }

    (async () => {
      try {
        // user_id로 서버가 실제 작성자인지 확인 — 본인 글이 아니면 403 → 그냥 빈 채팅으로 시작
        const res = await fetch(
          `${AI_API_URL}/conversations/${postId}?user_id=${encodeURIComponent(userId)}`,
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
  }, [postId, isSessionPending, session]);

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
      res = await fetch(`${AI_API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session?.user.id ?? "guest",
          post_id: postId,
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

  return { messages, input, setInput, handleSend, sendPreset };
}
