"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { TEMP_ID_PREFIX } from "@/shared/lib/temp-id";
import { addGroup, removeGroup, updateGroup } from "../lib/groups";
import { TASK_MUTATION_KEY, applyOptimistic, rollback, settle } from "./optimistic";
import type { TaskGroup, UpdateGroupInput } from "./types";

let tempSeq = 0;

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ name }: { name: string }) => api.post<TaskGroup>("/task-groups", { name }),
    onMutate: ({ name }) => {
      tempSeq += 1;
      return applyOptimistic(queryClient, (groups) =>
        addGroup(groups, { id: `${TEMP_ID_PREFIX}group-${tempSeq}`, name, starred: false, tasks: [] }),
      );
    },
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}

// 이름 변경과 별(중요) 토글이 모두 이 PATCH 하나다.
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ id, ...patch }: UpdateGroupInput) => api.patch<TaskGroup>(`/task-groups/${id}`, patch),
    onMutate: (patch) => applyOptimistic(queryClient, (groups) => updateGroup(groups, patch)),
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}

// 묶음을 지우면 안의 작업도 함께 사라진다(서버도 같이 지움). 확인 창은 호출하는 화면에서 띄운다.
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: ({ id }: { id: string }) => api.delete<void>(`/task-groups/${id}`),
    onMutate: ({ id }) => applyOptimistic(queryClient, (groups) => removeGroup(groups, id)),
    onError: (_e, _v, context) => rollback(queryClient, context),
    onSettled: () => settle(queryClient),
  });
}
