"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { TASK_GROUPS_KEY } from "./keys";
import type { TaskGroup } from "./types";

// "할 일" 탭 — 묶음과 그 안의 작업을 한 번에 받는다. "오늘 일정" 영역도 이 목록에서 계산한다.
export function useTaskGroups() {
  return useQuery({
    queryKey: TASK_GROUPS_KEY,
    queryFn: () => api.get<TaskGroup[]>("/task-groups"),
  });
}
