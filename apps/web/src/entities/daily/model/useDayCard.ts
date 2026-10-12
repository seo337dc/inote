"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { dayCardKey } from "./keys";
import type { DayCard } from "./types";

// 오늘 날짜면 서버가 활성 루틴의 오늘 기록을 (없을 때만) 만들어서 돌려준다.
export function useDayCard(date: string) {
  return useQuery({
    queryKey: dayCardKey(date),
    queryFn: () => api.get<DayCard>(`/daily/${date}`),
  });
}
