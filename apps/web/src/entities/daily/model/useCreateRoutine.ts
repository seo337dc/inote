"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { addRoutine } from "../lib/routines";
import { ROUTINES_KEY, TEMP_ID_PREFIX } from "./keys";
import type { Routine } from "./types";

const MUTATION_KEY = ["routine-create"];

let tempSeq = 0;

// 설정 화면에서 고정 항목 추가 — 낙관적으로 먼저 보여주고, 진짜 id는 다시 불러와서 맞춘다.
export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ title }: { title: string }) => api.post<Routine>("/routines", { title }),
    onMutate: async ({ title }) => {
      await queryClient.cancelQueries({ queryKey: ROUTINES_KEY });
      const previous = queryClient.getQueryData<Routine[]>(ROUTINES_KEY);
      if (previous) {
        tempSeq += 1;
        queryClient.setQueryData(ROUTINES_KEY, addRoutine(previous, { id: `${TEMP_ID_PREFIX}${tempSeq}`, title }));
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(ROUTINES_KEY, context.previous);
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
        queryClient.invalidateQueries({ queryKey: ROUTINES_KEY });
      }
    },
  });
}
