"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { markEntryRoutine } from "../lib/dayCard";
import { ROUTINES_KEY, TEMP_ID_PREFIX, dayCardKey } from "./keys";
import type { DayCard } from "./types";

// 그날 항목을 "매일 반복"으로 만든다 — 그 항목이 오늘 기록이 되고, 고정 리스트에 들어가 내일부터 [오늘 할일 생성]에서 가져온다. 낙관적으로 칩부터 보여준다.
export function useMakeRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId }: { entryId: string; date: string }) =>
      api.post<{ id: string; title: string }>("/routines", { entryId }),
    onMutate: async ({ entryId, date }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(date) });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(date));
      if (previous) {
        queryClient.setQueryData(dayCardKey(date), markEntryRoutine(previous, entryId, `${TEMP_ID_PREFIX}routine`));
      }
      return { previous };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(dayCardKey(date), context.previous);
    },
    onSettled: (_data, _error, { date }) => {
      queryClient.invalidateQueries({ queryKey: dayCardKey(date) });
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY }); // 고정 리스트에도 새로 생긴다
    },
  });
}
