"use client";

import { useDayHistory } from "@/entities/daily";
import { LoadMoreSentinel } from "@/shared/ui/load-more-sentinel";
import { DayCard } from "@/widgets/day-card";

// 전체 리스트 — 기록이 있는 날의 카드를 최신순으로 쌓고, 아래로 내리면 7일씩 이어서 불러온다(무한 스크롤).
export default function HistoryAll() {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useDayHistory();
  const cards = data?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) return <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>;
  if (isError) return <p className="py-10 text-center text-sm text-zinc-500">지난 기록을 불러오지 못했어요.</p>;
  if (cards.length === 0) return <p className="py-10 text-center text-sm text-zinc-500">아직 지난 기록이 없어요.</p>;

  return (
    <div className="space-y-4">
      {cards.map((card) => (
        <DayCard key={card.date} card={card} />
      ))}
      {hasNextPage && (
        <LoadMoreSentinel onLoadMore={() => !isFetchingNextPage && fetchNextPage()} loading={isFetchingNextPage} watch={cards.length} />
      )}
    </div>
  );
}
