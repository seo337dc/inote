import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkBreakTags } from "@/shared/lib/remark-break-tags";
import type { ChatMessage } from "../model/types";
import PendingBubble from "./PendingBubble";
import SourceCards from "./SourceCards";

type Props = {
  messages: ChatMessage[];
  // 출처 카드를 눌러 글로 이동할 때 (모바일 채팅 시트를 닫는 데 쓴다)
  onNavigate?: () => void;
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mt-3 mb-1.5 text-base font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-1.5 text-[15px] font-bold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2.5 mb-1 text-sm font-bold first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    // 코드블록(```)은 pre>code로 오고, 인라인 코드는 className이 없음
    if (!className) {
      return (
        <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-[0.85em]">
          {children}
        </code>
      );
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-zinc-800 p-2.5 font-mono text-[0.8em] text-zinc-100 last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-zinc-300 bg-zinc-200 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-zinc-300 px-2 py-1 align-top">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-zinc-300 pl-2 text-zinc-500 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-zinc-300" />,
};

function AssistantBubble({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패(권한 등) — 조용히 무시, 채팅 자체엔 영향 없음
    }
  }

  return (
    <div className="max-w-[85%] rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreakTags]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
      >
        {copied ? (
          <>
            <Check className="size-3.5" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            복사
          </>
        )}
      </button>
    </div>
  );
}

export default function ChatMessages({ messages, onNavigate }: Props) {
  // 모든 채팅 모드는 답변 말풍선을 빈 글자로 먼저 추가하고 스트림으로 채운다 — 마지막 답변이 비어 있으면 아직 기다리는 중이다.
  // (끝났는데 비어 있는 경우는 각 훅이 안내 문구로 바꿔서, 여기서 영원히 "조회 중"으로 남지 않는다)
  const last = messages[messages.length - 1];
  const waitingId = last?.role === "assistant" && last.text === "" ? last.id : null;

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          {m.role === "user" ? (
            <p className="max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap text-white">
              {m.text}
            </p>
          ) : (
            <div className="flex w-full flex-col items-start">
              {m.id === waitingId ? <PendingBubble /> : <AssistantBubble text={m.text} />}
              {m.sources && <SourceCards sources={m.sources} onNavigate={onNavigate} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
