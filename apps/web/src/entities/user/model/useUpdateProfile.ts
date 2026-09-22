"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../api/updateProfile";
import { MY_PROFILE_QUERY_KEY } from "./useMyProfile";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(MY_PROFILE_QUERY_KEY, updated);
    },
  });
}
