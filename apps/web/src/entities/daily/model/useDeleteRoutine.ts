"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { removeRoutineFromList } from "../lib/routines";
import { ROUTINES_KEY } from "./keys";
import type { Routine } from "./types";

// 고정 항목 삭제 — 목록에서만 빠진다. 이미 가져온 오늘·지난 카드의 항목은 그대로다.
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ routineId }: { routineId: string }) => api.delete<void>(`/routines/${routineId}`),
    onMutate: async ({ routineId }) => {
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueryData<Routine[]>(ROUTINES_KEY);
      if (previous) queryClient.setQueryData(ROUTINES_KEY, removeRoutineFromList(previous, routineId));
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
