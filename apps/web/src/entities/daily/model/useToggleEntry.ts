"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { setEntryDone } from "../lib/dayCard";
import { dayCardKey } from "./keys";
import type { DailyEntry, DayCard } from "./types";

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
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(date));
      if (previous) queryClient.setQueryData(dayCardKey(date), setEntryDone(previous, id, done));
      return { previous };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(dayCardKey(date), context.previous);
    },
    onSettled: (_data, _error, { date }) => {
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: dayCardKey(date) });
      }
    },
  });
}
