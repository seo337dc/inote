"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import { useMyProfile, useUpdateProfile, type UserProfile } from "@/entities/user";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";

// profile을 필수 prop으로 받아서 마운트 시점에 이미 서버 값이 있다는 걸 보장 — nickname
// state를 useEffect로 동기화할 필요 없이 useState 초기값으로 바로 채움.
function ProfileIdentity({ profile }: { profile: UserProfile }) {
  const updateProfileMutation = useUpdateProfile();
  const [nickname, setNickname] = useState(profile.nickname ?? profile.name);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate(
      { nickname },
      {
        onSuccess: () => toast.success("프로필이 저장되었습니다."),
        onError: () => toast.error("저장에 실패했습니다. 잠시 후 다시 시도해주세요."),
      },
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold text-zinc-500">
            {nickname.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold">{nickname}</p>
          <p className="text-sm text-zinc-400">{profile.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          닉네임
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={updateProfileMutation.isPending || !nickname.trim()}
          className="self-start rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
        >
          {updateProfileMutation.isPending ? "저장 중..." : "저장"}
        </button>
      </form>
    </>
  );
}

export default function ProfileForm() {
  const { data: profile, isPending: isProfilePending } = useMyProfile();
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const withdrawMutation = useMutation({
    mutationFn: () => api.delete("/users/me"),
    onSuccess: async () => {
      await authClient.signOut();
      // 로그아웃과 동일한 이유로 완전한 페이지 이동을 사용 — 클라이언트 세션 캐시가
      // 아직 반영 안 된 상태로 이동하면 로그인된 걸로 오인하는 레이스가 있음.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    },
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: inote-server의 Better Auth 비밀번호 변경 API 연동 (이메일 계정에만 해당)
    alert("아직 비밀번호 변경 API가 없습니다 (UI만 우선 구현).");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (isProfilePending || !profile) {
    return <p className="text-sm text-zinc-400">불러오는 중...</p>;
  }

  return (
    <>
      <ProfileIdentity profile={profile} />

      <div className="mt-8 border-t border-zinc-200 pt-8">
        <h2 className="mb-1 text-sm font-semibold">비밀번호 변경</h2>
        <p className="mb-4 text-xs text-zinc-400">
          이메일 계정으로 로그인한 경우에만 해당됩니다. Google 계정은 Google에서 비밀번호를
          관리합니다.
        </p>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            현재 비밀번호
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded border border-zinc-300 px-3 py-2 outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            새 비밀번호
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="rounded border border-zinc-300 px-3 py-2 outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            새 비밀번호 확인
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="rounded border border-zinc-300 px-3 py-2 outline-none"
            />
          </label>
          {passwordMismatch && (
            <p className="text-xs text-red-500">새 비밀번호가 서로 일치하지 않습니다.</p>
          )}

          <button
            type="submit"
            disabled={
              !currentPassword ||
              newPassword.length < 8 ||
              newPassword !== confirmPassword
            }
            className="self-start rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
          >
            비밀번호 변경
          </button>
        </form>
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-8">
        <h2 className="mb-1 text-sm font-semibold text-red-600">위험 구역</h2>
        <p className="mb-4 text-xs text-zinc-400">
          회원 탈퇴 시 계정과 로그인 정보는 즉시 삭제됩니다. 작성한 글은 삭제되지 않고
          작성자 없음으로 남습니다. 되돌릴 수 없습니다.
        </p>
        <Button type="button" variant="destructive" onClick={() => setConfirmingWithdraw(true)}>
          회원 탈퇴
        </Button>
      </div>

      {confirmingWithdraw && (
        <Dialog open onOpenChange={(open) => !open && setConfirmingWithdraw(false)}>
          <DialogContent>
            <DialogTitle>정말 회원 탈퇴하시겠습니까?</DialogTitle>
            <DialogDescription>
              계정과 로그인 정보가 즉시 삭제되고 되돌릴 수 없습니다. 작성한 글은 작성자 없음으로
              남습니다.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingWithdraw(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={withdrawMutation.isPending}
                onClick={() => withdrawMutation.mutate()}
              >
                {withdrawMutation.isPending ? "탈퇴 처리 중..." : "탈퇴하기"}
              </Button>
            </div>
            {withdrawMutation.isError && (
              <p className="text-xs text-red-500">
                탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
