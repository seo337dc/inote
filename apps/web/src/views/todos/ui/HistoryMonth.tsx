"use client";

import { useState } from "react";
import { countDone, groupByWeek, useDayMonth } from "@/entities/daily";
import { todayKst } from "@/shared/lib/date";
import { DayCard } from "@/widgets/day-card";
import MonthNav from "./MonthNav";

type Props = {
  // 주차별: 달 안에서 "N주차"로 묶어 보여준다 / 월별: 묶음 제목 없이 그 달 카드를 최신순으로
  grouped: boolean;
};

// 달 이동 + 그 달의 카드. 이번 달까지만 갈 수 있다(오늘 이후 기록은 없다).
export default function HistoryMonth({ grouped }: Props) {
  const thisMonth = todayKst().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const { data: cards, isPending, isError } = useDayMonth(month);
  const monthNumber = Number(month.slice(5));

  return (
    <div>
      <MonthNav month={month} thisMonth={thisMonth} onChange={setMonth} />

      {isPending ? (
        <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-zinc-500">지난 기록을 불러오지 못했어요.</p>
      ) : cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">이 달에는 기록이 없어요.</p>
      ) : grouped ? (
        <div className="space-y-6">
          {groupByWeek(cards).map(({ week, cards: weekCards }) => {
            const { done, total } = countDone(weekCards.flatMap((c) => c.entries));
            return (
              <section key={week} aria-label={`${monthNumber}월 ${week}주차`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
                    {monthNumber}월 {week}주차
                  </h2>
                  <span className="text-xs font-semibold text-zinc-700">
                    {total}개 중 {done}개 완료
                  </span>
                </div>
                <div className="space-y-3">
                  {weekCards.map((card) => (
                    <DayCard key={card.date} card={card} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <DayCard key={card.date} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
