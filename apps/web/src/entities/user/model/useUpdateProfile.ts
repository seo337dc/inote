"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { MY_PROFILE_QUERY_KEY } from "./useMyProfile";
import type { UpdateProfileInput, UserProfile } from "./types";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.patch<UserProfile>("/users/me", input),
    onSuccess: (updated) => {
      queryClient.setQueryData(MY_PROFILE_QUERY_KEY, updated);
    },
  });
}
