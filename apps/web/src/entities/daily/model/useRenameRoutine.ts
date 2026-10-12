"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { renameRoutineInList } from "../lib/routines";
import { ROUTINES_KEY } from "./keys";
import type { Routine } from "./types";

// 고정 항목 이름 변경 — 앞으로 가져올 때부터 바뀐다. 이미 가져온 오늘·지난 카드의 항목은 그대로다.
export function useRenameRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId, title }: { routineId: string; title: string }) =>
      api.patch<Routine>(`/routines/${routineId}`, { title }),
    onMutate: async ({ routineId, title }) => {
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueryData<Routine[]>(ROUTINES_KEY);
      if (previous) queryClient.setQueryData(ROUTINES_KEY, renameRoutineInList(previous, routineId, title));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ROUTINES_KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
    },
  });
}
