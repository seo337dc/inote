"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

export type AdminUserDetail = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  usesInote: boolean;
  usesInoteMoney: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: Boolean(id),
  });
}
