"use client";

import { useState } from "react";
import { countDone, useDayMonth, type DayCard as DayCardData } from "@/entities/daily";
import { formatDayHeader, todayKst } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { DayCard } from "@/widgets/day-card";
import MonthNav from "./MonthNav";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");

// 달력 보기 — 기록이 있는 날에 완료 현황을 찍고, 누르면 그날 카드를 팝업으로 연다(체크 변경 가능). 일요일 시작.
export default function HistoryCalendar() {
  const today = todayKst();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: cards, isPending, isError } = useDayMonth(month);

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // 팝업은 목록 캐시에서 카드를 찾아 그리므로, 체크를 바꾸면 달력 칸과 팝업이 같이 바뀐다
  const byDate = new Map<string, DayCardData>((cards ?? []).map((card) => [card.date, card]));
  const selectedCard = selected ? byDate.get(selected) : undefined;

  return (
    <div>
      <MonthNav month={month} thisMonth={thisMonth} onChange={setMonth} />

      {isError ? (
        <p className="py-10 text-center text-sm text-zinc-500">지난 기록을 불러오지 못했어요.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-7 border-b border-zinc-100">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  "py-2 text-center text-xs font-semibold",
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-zinc-400",
                )}
              >
                {label}
              </div>
            ))}
          </div>

          <div className={cn("grid grid-cols-7", isPending && "opacity-60")} aria-busy={isPending}>
            {cells.map((day, idx) => {
              const cellClass = "flex min-h-[56px] flex-col border-r border-b border-zinc-50 p-1.5 md:min-h-[88px] md:p-2";
              if (!day) return <div key={`empty-${idx}`} className={cn(cellClass, "bg-zinc-50/50")} />;

              const date = `${month}-${pad(day)}`;
              const card = byDate.get(date);
              const weekday = (firstWeekday + day - 1) % 7;
              const number = (
                <span
                  className={cn(
                    "mb-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold md:text-sm",
                    date === today
                      ? "bg-emerald-500 text-white"
                      : weekday === 0
                        ? "text-red-400"
                        : weekday === 6
                          ? "text-blue-400"
                          : "text-zinc-700",
                  )}
                >
                  {day}
                </span>
              );

              if (!card) {
                return (
                  <div key={date} className={cellClass}>
                    {number}
                  </div>
                );
              }

              const { done, total } = countDone(card.entries);
              const allDone = total > 0 && done === total;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-label={`${formatDayHeader(date)}, ${total}개 중 ${done}개 완료`}
                  className={cn(cellClass, "text-left transition-colors hover:bg-emerald-50/60 focus-visible:bg-emerald-50/60 focus-visible:outline-none")}
                >
                  {number}
                  <span className={cn("hidden truncate text-[11px] font-medium leading-tight sm:block", allDone ? "text-emerald-600" : "text-zinc-500")}>
                    완료 {done}/{total}
                  </span>
                  <span className={cn("mt-auto size-1.5 shrink-0 rounded-full sm:hidden", allDone ? "bg-emerald-500" : "bg-zinc-400")} />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              모두 완료
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-zinc-400" />
              남은 항목 있음
            </span>
          </div>
        </div>
      )}

      {selectedCard && (
        <Dialog open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto p-4" showCloseButton={false}>
            <DialogTitle className="sr-only">{formatDayHeader(selectedCard.date)} 기록</DialogTitle>
            <DayCard card={selectedCard} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
