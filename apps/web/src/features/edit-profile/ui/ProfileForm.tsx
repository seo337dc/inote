"use client";

import { useState } from "react";

export default function ProfileForm() {
  const [nickname, setNickname] = useState("seo337dc");

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
    </>
  );
}
