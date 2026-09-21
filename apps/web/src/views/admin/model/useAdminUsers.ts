"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

export type AdminUser = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  role: "USER" | "ADMIN";
  usesInote: boolean;
  usesInoteMoney: boolean;
  createdAt: string;
};

export type AdminUsersPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useAdminUsers(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ["admin-users", page, pageSize],
    queryFn: () =>
      api.get<AdminUsersPage>(`/admin/users?page=${page}&pageSize=${pageSize}`),
    // 페이지 이동 시 이전 목록을 유지한 채로 로딩 — 매번 깜빡이며 빈 화면이 되는 것 방지
    placeholderData: keepPreviousData,
  });
}
