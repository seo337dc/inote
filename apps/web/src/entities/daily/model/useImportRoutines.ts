"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { dayCardKey } from "./keys";
import type { DayCard } from "./types";

// 설정 화면의 [오늘 카드에 모두 가져오기] — 고정 리스트의 제목을 오늘 카드에 새 항목으로 복사한다(서버에 저장).
// 서버가 돌려준 오늘 카드를 그대로 캐시에 넣어, 오늘의 할일로 가면 바로 보이게 한다.
export function useImportRoutines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<DayCard>("/daily/from-routines", {}),
    onSuccess: (card) => {
      queryClient.setQueryData(dayCardKey(card.date), card);
    },
  });
}
