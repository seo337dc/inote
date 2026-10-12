"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { removeRoutineEntries } from "../lib/dayCard";
import { removeRoutineFromList } from "../lib/routines";
import { ROUTINES_KEY, dayCardKey } from "./keys";
import type { DayCard, Routine } from "./types";

// 루틴 삭제 — "오늘부터" 안 나온다. 오늘 카드에서만 지우고 어제까지의 기록은 그대로 둔다.
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId }: { routineId: string; today: string }) =>
      api.delete<void>(`/routines/${routineId}`),
    onMutate: async ({ routineId, today }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(today) });
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(today));
      if (previous) {
        queryClient.setQueryData(dayCardKey(today), removeRoutineEntries(previous, routineId));
      }
      const previousRoutines = queryClient.getQueryData<Routine[]>(ROUTINES_KEY);
      if (previousRoutines) queryClient.setQueryData(ROUTINES_KEY, removeRoutineFromList(previousRoutines, routineId));
      return { previous, previousRoutines };
    },
    onError: (_error, { today }, context) => {
      if (context?.previous) queryClient.setQueryData(dayCardKey(today), context.previous);
      if (context?.previousRoutines) queryClient.setQueryData(ROUTINES_KEY, context.previousRoutines);
    },
    onSettled: (_data, _error, { today }) => {
      queryClient.invalidateQueries({ queryKey: dayCardKey(today) });
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
    },
  });
}
