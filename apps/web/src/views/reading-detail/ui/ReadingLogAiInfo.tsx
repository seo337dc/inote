"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { ReadingLogSummary } from "@/entities/reading-log";

type Props = {
  summary: ReadingLogSummary;
};

export default function ReadingLogAiInfo({ summary }: Props) {
  const [open, setOpen] = useState(true);
  const rows = [
    { label: "장르", value: summary.genre },
    { label: "줄거리", value: summary.synopsis },
    { label: "작가 소개", value: summary.authorBio },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-zinc-700"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-4" />
          AI 책 정보
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <dl className="mt-2 space-y-1.5 text-sm text-zinc-600">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-2">
              <dt className="shrink-0 font-medium text-zinc-500">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
