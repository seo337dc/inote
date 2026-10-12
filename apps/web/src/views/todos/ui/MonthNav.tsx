"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth, shiftMonth } from "@/shared/lib/date";

type Props = {
  month: string;
  // 이번 달 — 이 달보다 뒤로는 갈 수 없다(오늘 이후 기록은 없다)
  thisMonth: string;
  onChange: (month: string) => void;
};

// ◀ 2026년 10월 ▶ — 지난 기록의 달 이동 (주차별·월별·달력 보기가 같이 쓴다)
export default function MonthNav({ month, thisMonth, onChange }: Props) {
  return (
    <div className="mb-4 flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="이전 달"
        className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="text-lg font-bold" aria-live="polite">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= thisMonth}
        aria-label="다음 달"
        className="flex size-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
