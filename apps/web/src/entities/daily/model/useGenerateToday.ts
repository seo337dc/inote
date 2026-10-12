"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { dayCardKey } from "./keys";
import type { DayCard } from "./types";

// [오늘 할일 생성] — 고정 리스트를 오늘 카드로 가져온다. 서버가 만든 카드를 그대로 캐시에 넣는다.
// 고정 리스트가 비어 있으면 카드도 비어 돌아온다(호출하는 쪽이 안내한다).
export function useGenerateToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<DayCard>("/daily/generate", {}),
    onSuccess: (card) => {
      queryClient.setQueryData(dayCardKey(card.date), card);
    },
  });
}
