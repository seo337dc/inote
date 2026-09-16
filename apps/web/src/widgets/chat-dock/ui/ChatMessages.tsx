import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../model/types";

type Props = {
  messages: ChatMessage[];
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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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

export default function ChatMessages({ messages }: Props) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          {m.role === "user" ? (
            <p className="max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap text-white">
              {m.text}
            </p>
          ) : (
            <AssistantBubble text={m.text} />
          )}
        </div>
      ))}
    </div>
  );
}
