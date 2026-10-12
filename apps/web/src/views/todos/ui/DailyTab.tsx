"use client";

import Link from "next/link";
import { useDayCard } from "@/entities/daily";
import { todayKst } from "@/shared/lib/date";
import { DayCard } from "@/widgets/day-card";

// "오늘의 할일" 탭 — 오늘 카드 한 장. 지난 기록은 별도 화면에서 본다.
export default function DailyTab() {
  const today = todayKst();
  const { data: card, isPending, isError } = useDayCard(today);

  if (isPending) return <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>;
  if (isError || !card) {
    return <p className="py-10 text-center text-sm text-zinc-500">오늘의 할일을 불러오지 못했어요.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="text-right">
        <Link href="/todos/history" className="text-sm text-zinc-500 hover:text-zinc-900">
          지난 기록 보기 →
        </Link>
      </div>
      <DayCard card={card} isToday />
    </div>
  );
}
