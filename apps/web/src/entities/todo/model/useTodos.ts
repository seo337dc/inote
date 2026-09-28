"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { Todo } from "./types";

export const TODOS_QUERY_KEY = ["todos"];

export function useTodos() {
  return useQuery({
    queryKey: TODOS_QUERY_KEY,
    queryFn: () => api.get<Todo[]>("/todos"),
  });
}
