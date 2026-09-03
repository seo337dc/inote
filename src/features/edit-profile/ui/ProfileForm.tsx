"use client";

import { useState } from "react";

export default function ProfileForm() {
  const [nickname, setNickname] = useState("seo337dc");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: 기존 inote-server의 유저 정보 API 재사용 여부 확인 후 연동 (docs/devlog/fe.md 참고)
    alert("아직 저장 API가 없습니다 (UI만 우선 구현).");
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
          className="self-start rounded bg-zinc-900 px-5 py-2 text-white"
        >
          저장
        </button>
      </form>
    </>
  );
}
