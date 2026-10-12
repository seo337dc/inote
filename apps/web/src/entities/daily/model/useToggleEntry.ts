"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { InfiniteData } from "@tanstack/react-query";
import { setEntryDone, setEntryDoneInPages } from "../lib/dayCard";
import { DAILY_HISTORY_KEY, DAILY_MONTH_KEY, dayCardKey } from "./keys";
import type { DailyEntry, DayCard, DayCardPage } from "./types";

type History = InfiniteData<DayCardPage, string | null>;

const MUTATION_KEY = ["daily-toggle-entry"];

// 체크박스 — 낙관적 업데이트(로딩 표시 없음). 실패하면 이전 상태로 되돌린다. 지난 날짜 카드도 바꿀 수 있다.
export function useToggleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ id, done }: { id: string; date: string; done: boolean }) =>
      api.patch<DailyEntry>(`/daily/entries/${id}`, { done }),
    onMutate: async ({ id, date, done }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(date) });
      await queryClient.cancelQueries({ queryKey: DAILY_HISTORY_KEY });
      await queryClient.cancelQueries({ queryKey: DAILY_MONTH_KEY });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(date));
      if (previous) queryClient.setQueryData(dayCardKey(date), setEntryDone(previous, id, done));
      // 지난 기록 화면의 카드는 목록 캐시에서 온다 — 거기도 같이 바꾼다
      const previousHistory = queryClient.getQueryData<History>(DAILY_HISTORY_KEY);
      if (previousHistory) queryClient.setQueryData(DAILY_HISTORY_KEY, setEntryDoneInPages(previousHistory, id, done));
      // 주차별·월별 보기는 달 단위 캐시에서 온다 — 열어 본 달 전부를 같이 바꾼다
      const previousMonths = queryClient.getQueriesData<DayCard[]>({ queryKey: DAILY_MONTH_KEY });
      queryClient.setQueriesData<DayCard[]>({ queryKey: DAILY_MONTH_KEY }, (cards) =>
        cards?.map((card) => setEntryDone(card, id, done)),
      );
      return { previous, previousHistory, previousMonths };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(dayCardKey(date), context.previous);
      if (context?.previousHistory) queryClient.setQueryData(DAILY_HISTORY_KEY, context.previousHistory);
      context?.previousMonths.forEach(([key, cards]) => queryClient.setQueryData(key, cards));
    },
    onSettled: (_data, _error, { date }) => {
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: dayCardKey(date) });
        queryClient.invalidateQueries({ queryKey: DAILY_HISTORY_KEY });
        queryClient.invalidateQueries({ queryKey: DAILY_MONTH_KEY });
      }
    },
  });
}
