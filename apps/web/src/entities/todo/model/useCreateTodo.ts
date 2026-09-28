"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { Todo } from "./types";
import { TODOS_QUERY_KEY } from "./useTodos";

type CreateTodoInput = {
  title: string;
  dueDate?: string;
};

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => api.post<Todo>("/todos", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
