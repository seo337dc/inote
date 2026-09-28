"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { Todo } from "./types";
import { TODOS_QUERY_KEY } from "./useTodos";

type UpdateTodoInput = {
  id: string;
  title?: string;
  dueDate?: string;
  done?: boolean;
};

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTodoInput) => api.patch<Todo>(`/todos/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
