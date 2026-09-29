"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

type Props = {
  summary: string[];
  // 수정 화면처럼 "지금 보이는 요약이 어떤 상태인지" 안내가 필요할 때
  hint?: string;
};

export default function PostAiSummary({ summary, hint }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-zinc-700"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-4" />
          AI 개요
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
      {open && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-600">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
