"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { TEMP_ID_PREFIX } from "@/shared/lib/temp-id";
import { addTask, removeTask, reorderTasks, updateTask } from "../lib/groups";
import { TASK_MUTATION_KEY, applyOptimistic, rollback, settle } from "./optimistic";
import type { CreateTaskInput, Task, UpdateTaskInput } from "./types";

let tempSeq = 0;

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ groupId, title, startDate, endDate }: CreateTaskInput) =>
      api.post<Task>(`/task-groups/${groupId}/tasks`, { title, startDate: startDate ?? null, endDate: endDate ?? null }),
    onMutate: ({ groupId, title, startDate, endDate }) => {
      tempSeq += 1;
      return applyOptimistic(queryClient, (groups) =>
        addTask(groups, {
          id: `${TEMP_ID_PREFIX}task-${tempSeq}`,
          groupId,
          title,
          status: "TODO",
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          starred: false,
        }),
      );
    },
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}

// 상태 변경·이름 수정·일정 변경·별 토글이 모두 이 PATCH 하나다(startDate/endDate: null이면 해제).
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ id, ...patch }: UpdateTaskInput) => api.patch<Task>(`/tasks/${id}`, patch),
    onMutate: (patch) => applyOptimistic(queryClient, (groups) => updateTask(groups, patch)),
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ id }: { id: string }) => api.delete<void>(`/tasks/${id}`),
    onMutate: ({ id }) => applyOptimistic(queryClient, (groups) => removeTask(groups, id)),
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}

// 묶음 카드 안에서 끌어서 순서를 바꾼다 — 전체 id 순서를 서버에 저장한다.
export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ groupId, taskIds }: { groupId: string; taskIds: string[] }) =>
      api.put<void>(`/task-groups/${groupId}/tasks/order`, { taskIds }),
    onMutate: ({ groupId, taskIds }) => applyOptimistic(queryClient, (groups) => reorderTasks(groups, groupId, taskIds)),
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}
