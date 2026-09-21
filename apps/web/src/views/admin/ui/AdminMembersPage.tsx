"use client";

import { useState } from "react";
import { useAdminUsers } from "../model/useAdminUsers";
import { Button } from "@/shared/ui/button";
import { PageLoading } from "@/shared/ui/page-loading";
import AdminUserDetailModal from "./AdminUserDetailModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR");
}

export default function AdminMembersPage() {
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data, isPending, isPlaceholderData, isError } = useAdminUsers(page);

  if (isPending && !data) {
    return <PageLoading />;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">회원 정보</h1>
      <p className="mb-6 text-sm text-zinc-500">{data && `총 ${data.total}명`}</p>

      {isError && (
        <p className="text-sm text-red-500">
          회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-zinc-400">회원이 없습니다.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
                  <th className="px-4 py-2 font-medium">이름 / 닉네임</th>
                  <th className="px-4 py-2 font-medium">이메일</th>
                  <th className="px-4 py-2 font-medium">권한</th>
                  <th className="px-4 py-2 font-medium">inote</th>
                  <th className="px-4 py-2 font-medium">inote-money</th>
                  <th className="px-4 py-2 font-medium">가입일</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium">{user.nickname ?? user.name}</div>
                      {user.nickname && (
                        <div className="text-xs text-zinc-400">{user.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{user.email}</td>
                    <td className="px-4 py-2">
                      {user.role === "ADMIN" ? (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-zinc-400">일반</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {user.usesInote ? "이용" : "-"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {user.usesInoteMoney ? "이용" : "-"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </Button>
            <span className="text-sm text-zinc-500">
              {data.page} / {data.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages || isPlaceholderData}
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            >
              다음
            </Button>
          </div>
        </>
      )}

      {selectedUserId && (
        <AdminUserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
