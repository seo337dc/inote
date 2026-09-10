"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

// TODO: 임시 목업 — 실제로는 inote-ai가 글 내용을 요약해서 내려주는 값으로 교체 예정
const MOCK_SUMMARY = [
  "클로드(LLM)는 지능이 있는 게 아니라 “다음에 올 단어”를 확률적으로 예측하는 모델",
  "수천억 개 문장을 학습해 “이 문맥 다음엔 어떤 단어가 올 확률이 높은가”를 계산하도록 훈련됨",
  "정답을 아는 게 아니라 가장 그럴듯한 텍스트를 생성하는 것 — 그래서 틀려도 자신 있게 말함(Hallucination)",
  "기존 프로그램(if/else 규칙 기반)과 달리 확률 기반이라 예측 불가능성과 유연성이 둘 다 높음",
];

export default function PostAiSummary() {
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
      {open && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-zinc-600">
          {MOCK_SUMMARY.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
