"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { removeRoutineEntries } from "../lib/dayCard";
import { dayCardKey } from "./keys";
import type { DayCard } from "./types";

// 루틴 삭제 — "오늘부터" 안 나온다. 오늘 카드에서만 지우고 어제까지의 기록은 그대로 둔다.
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId }: { routineId: string; today: string }) =>
      api.delete<void>(`/routines/${routineId}`),
    onMutate: async ({ routineId, today }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(today) });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(today));
      if (previous) {
        queryClient.setQueryData(dayCardKey(today), removeRoutineEntries(previous, routineId));
      }
      return { previous };
    },
    onError: (_error, { today }, context) => {
      if (context?.previous) queryClient.setQueryData(dayCardKey(today), context.previous);
    },
    onSettled: (_data, _error, { today }) => {
      queryClient.invalidateQueries({ queryKey: dayCardKey(today) });
    },
  });
}
