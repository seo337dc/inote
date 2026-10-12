"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { renameRoutineEntries } from "../lib/dayCard";
import { dayCardKey } from "./keys";
import type { DayCard } from "./types";

// 루틴 이름 변경 — "오늘부터" 적용된다. 오늘 카드만 바꾸고, 지난 카드는 그때 이름 그대로 둔다.
export function useRenameRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId, title }: { routineId: string; title: string; today: string }) =>
      api.patch<{ id: string; title: string }>(`/routines/${routineId}`, { title }),
    onMutate: async ({ routineId, title, today }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(today) });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(today));
      if (previous) {
        queryClient.setQueryData(dayCardKey(today), renameRoutineEntries(previous, routineId, title));
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
