"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import type { Category } from "./types";

export const CATEGORIES_QUERY_KEY = ["categories"];

export function useCategories() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => api.get<Category[]>("/categories"),
    enabled: !isSessionPending && Boolean(session),
  });
}
