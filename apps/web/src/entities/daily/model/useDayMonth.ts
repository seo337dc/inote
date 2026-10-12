"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { monthRange } from "@/shared/lib/date";
import { DAILY_MONTH_KEY } from "./keys";
import type { DayCardPage } from "./types";

// 한 달에 낼 수 있는 카드 수의 최대치 — 이 안에서는 [더 보기]가 필요 없다.
const MAX_DAYS_IN_MONTH = 31;

// 지난 기록의 한 달 치 — 기록이 있는 날만, 최신순. month는 'YYYY-MM'.
// 오늘(과 그 이후)은 서버가 알아서 뺀다 — 오늘은 "오늘의 할일" 탭에서 본다.
export function useDayMonth(month: string) {
  return useQuery({
    queryKey: [...DAILY_MONTH_KEY, month],
    queryFn: async () => {
      const { from, before } = monthRange(month);
      const page = await api.get<DayCardPage>(`/daily?from=${from}&before=${before}&limit=${MAX_DAYS_IN_MONTH}`);
      return page.items;
    },
  });
}
