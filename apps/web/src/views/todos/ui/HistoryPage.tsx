"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDayHistory } from "@/entities/daily";
import { PageLoading } from "@/shared/ui/page-loading";
import { Button } from "@/shared/ui/button";
import { useSession } from "@/shared/lib/auth-client";
import { DayCard } from "@/widgets/day-card";

// 지난 기록 — 기록이 있는 날의 카드를 최신순으로 쌓고, [더 보기]로 이어서 불러온다. 입력줄은 없고 체크는 바꿀 수 있다.
export default function HistoryPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useDayHistory();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <PageLoading />;
  }

  const cards = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-bold">지난 기록</h1>
        <Link href="/todos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" />
          오늘의 할일로
        </Link>
      </div>

      {isPending ? (
        <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-zinc-500">지난 기록을 불러오지 못했어요.</p>
      ) : cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">아직 지난 기록이 없어요.</p>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <DayCard key={card.date} card={card} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "불러오는 중…" : "더 보기"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
