"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { DAILY_HISTORY_KEY } from "./keys";
import type { DayCardPage } from "./types";

// 한 번에 불러오는 카드 수 — 기록이 있는 날만 세므로 빈 날은 건너뛴다.
export const HISTORY_PAGE_SIZE = 7;

// 지난 기록 — 최신순으로 쌓이고, nextBefore가 null이면 끝. [더 보기]가 fetchNextPage.
export function useDayHistory() {
  return useInfiniteQuery({
    queryKey: DAILY_HISTORY_KEY,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const before = pageParam ? `&before=${pageParam}` : "";
      return api.get<DayCardPage>(`/daily?limit=${HISTORY_PAGE_SIZE}${before}`);
    },
    getNextPageParam: (last) => last.nextBefore,
  });
}
