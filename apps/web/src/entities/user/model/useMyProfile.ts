"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import type { UserProfile } from "./types";

export const MY_PROFILE_QUERY_KEY = ["my-profile"];

export function useMyProfile() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => api.get<UserProfile>("/users/me"),
    enabled: !isSessionPending && Boolean(session),
  });
}
