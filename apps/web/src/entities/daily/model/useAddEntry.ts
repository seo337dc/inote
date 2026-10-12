"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { appendEntry } from "../lib/dayCard";
import { TEMP_ID_PREFIX, dayCardKey } from "./keys";
import type { AddEntryInput, DailyEntry, DayCard } from "./types";

const MUTATION_KEY = ["daily-add-entry"];

let tempSeq = 0;

// 오늘 카드의 입력줄 — 낙관적으로 먼저 보여주고, 서버가 준 진짜 id는 다시 불러와서 맞춘다.
export function useAddEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ title }: AddEntryInput & { date: string }) => api.post<DailyEntry>("/daily/entries", { title }),
    onMutate: async ({ date, title }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(date) });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(date));
      if (previous) {
        tempSeq += 1;
        const temp: DailyEntry = {
          id: `${TEMP_ID_PREFIX}${tempSeq}`,
          date,
          title,
          done: false,
          routineId: null,
        };
        queryClient.setQueryData(dayCardKey(date), appendEntry(previous, temp));
      }
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
