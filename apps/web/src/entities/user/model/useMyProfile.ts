"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyProfile } from "../api/getMyProfile";

export const MY_PROFILE_QUERY_KEY = ["my-profile"];

export function useMyProfile() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: getMyProfile,
    enabled: !isSessionPending && Boolean(session),
  });
}
