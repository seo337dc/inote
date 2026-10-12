"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { renameRoutineEntries } from "../lib/dayCard";
import { renameRoutineInList } from "../lib/routines";
import { ROUTINES_KEY, dayCardKey } from "./keys";
import type { DayCard, Routine } from "./types";

// 루틴 이름 변경 — "오늘부터" 적용된다. 오늘 카드만 바꾸고, 지난 카드는 그때 이름 그대로 둔다.
export function useRenameRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId, title }: { routineId: string; title: string; today: string }) =>
      api.patch<{ id: string; title: string }>(`/routines/${routineId}`, { title }),
    onMutate: async ({ routineId, title, today }) => {
      await queryClient.cancelQueries({ queryKey: dayCardKey(today) });
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueryData<DayCard>(dayCardKey(today));
      if (previous) {
        queryClient.setQueryData(dayCardKey(today), renameRoutineEntries(previous, routineId, title));
      }
      // 설정 화면의 고정 리스트에서도 같이 바뀐다
      const previousRoutines = queryClient.getQueryData<Routine[]>(ROUTINES_KEY);
      if (previousRoutines) queryClient.setQueryData(ROUTINES_KEY, renameRoutineInList(previousRoutines, routineId, title));
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
