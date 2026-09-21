"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/dialog";
import { PageLoading } from "@/shared/ui/page-loading";
import { Button } from "@/shared/ui/button";
import { useAdminUser } from "../model/useAdminUser";
import { useDeleteAdminUser } from "../model/useDeleteAdminUser";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-900">{value}</span>
    </div>
  );
}

export default function AdminUserDetailModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { data: user, isPending, isError } = useAdminUser(userId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteAdminUser();

  function handleDelete() {
    deleteMutation.mutate(userId, {
      onSuccess: (result) => {
        toast.success("회원이 삭제되었습니다.");
        if (!result.aiDataDeleted) {
          toast.warning(
            "inote-ai 데이터 삭제에는 실패했습니다. 확인이 필요합니다.",
          );
        }
        onClose();
      },
      onError: () => {
        toast.error("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setConfirmingDelete(false);
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* 삭제 확인 팝업이 중첩 Dialog라, base-ui가 배경(backdrop)을 하나만 공유해서
          렌더링함 — 안쪽 팝업이 아니라 바깥쪽 여기서 overlayClassName을 조건부로 줘야
          실제로 반영됨 */}
      <DialogContent
        overlayClassName={
          confirmingDelete ? "bg-black/60 backdrop-blur-sm" : undefined
        }
      >
        <DialogTitle>회원 정보</DialogTitle>
        <DialogDescription className="sr-only">
          선택한 회원의 상세 정보
        </DialogDescription>

        {/* 로딩/에러/조회완료 어떤 상태든 모달 크기가 그대로 유지되도록 높이 고정 */}
        <div className="h-[380px] overflow-y-auto">
          {isPending && (
            <div className="h-full">
              <PageLoading compact />
            </div>
          )}

          {isError && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-red-500">
                회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
              </p>
            </div>
          )}

          {user && (
            <>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                      <UserRound className="size-8" aria-hidden="true" />
                      <span className="sr-only">프로필 이미지 없음</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{user.nickname ?? user.name}</p>
                    {user.nickname && (
                      <p className="text-sm text-zinc-400">{user.name}</p>
                    )}
                  </div>
                </div>
                {/* TODO: 수정 범위 확정되면 onClick 연결 (AUTH_POLICY 관련 논의 필요) */}
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm">
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    삭제
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                <Field label="이메일" value={user.email} />
                <Field label="전화번호" value={user.phone ?? "-"} />
                <Field
                  label="권한"
                  value={
                    user.role === "ADMIN" ? (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                        ADMIN
                      </span>
                    ) : (
                      "일반"
                    )
                  }
                />
                <Field
                  label="inote 이용"
                  value={user.usesInote ? "이용" : "-"}
                />
                <Field
                  label="inote-money 이용"
                  value={user.usesInoteMoney ? "이용" : "-"}
                />
                <Field label="가입일" value={formatDateTime(user.createdAt)} />
                <Field
                  label="최근 수정일"
                  value={formatDateTime(user.updatedAt)}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {confirmingDelete &&
        createPortal(
          // base-ui가 중첩 Dialog끼리 backdrop을 하나만 공유해서, 삭제 확인 팝업
          // 자체 배경을 따로 못 넣음 — 그 위에 겹치는 어두운 레이어를 하나 더 얹어서
          // 배경이 한 번 더 어두워진 것처럼 보이게 함 (실제 DOM에 별도로 추가됨).
          <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />,
          document.body,
        )}

      {confirmingDelete && (
        <Dialog
          open
          onOpenChange={(open) => !open && setConfirmingDelete(false)}
        >
          <DialogContent className="max-w-xl">
            <DialogTitle>정말 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              계정과 작성한 글, inote-ai 대화 기록까지 모두 삭제되며 되돌릴
              수 없습니다.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmingDelete(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제하기"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
