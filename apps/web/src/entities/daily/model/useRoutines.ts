"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { ROUTINES_KEY } from "./keys";
import type { Routine } from "./types";

// 고정 리스트 — 설정 화면에서 보고 관리한다.
export function useRoutines() {
  return useQuery({
    queryKey: ROUTINES_KEY,
    queryFn: () => api.get<Routine[]>("/routines"),
  });
}
