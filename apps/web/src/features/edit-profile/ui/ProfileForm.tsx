"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";

export default function ProfileForm() {
  const [nickname, setNickname] = useState("seo337dc");
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: 기존 inote-server의 유저 정보 API 재사용 여부 확인 후 연동 (docs/devlog/fe.md 참고)
    alert("아직 저장 API가 없습니다 (UI만 우선 구현).");
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: inote-server의 Better Auth 비밀번호 변경 API 연동 (이메일 계정에만 해당)
    alert("아직 비밀번호 변경 API가 없습니다 (UI만 우선 구현).");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-bold text-zinc-500">
          {nickname.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{nickname}</p>
          <p className="text-sm text-zinc-400">sdc337dc@gmail.com</p>
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
          className="self-start rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800"
        >
          저장
        </button>
      </form>

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
