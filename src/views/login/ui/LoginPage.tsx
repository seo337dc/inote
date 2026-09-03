"use client";

import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3a7.4 7.4 0 0 1-4.07 1.16c-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export default function LoginPage() {
  function handleEmailStart() {
    // TODO: inote-server의 Better Auth 이메일 로그인 연동 (docs/devlog/fe.md 참고)
    alert("아직 이메일 로그인 연동 전입니다 (inote-server Better Auth 연동 예정)");
  }

  function handleGoogle() {
    // TODO: inote-server의 Better Auth Google OAuth 연동
    alert("아직 Google 로그인 연동 전입니다 (inote-server Better Auth 연동 예정)");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="mb-1 text-xl font-bold tracking-tight">inote-blog</p>
        <p className="mb-8 text-sm text-zinc-500">
          노션처럼 쓰고, LLM과 함께 정리하는
          <br />
          나만의 기록 공간
        </p>

        <Button onClick={handleEmailStart} size="lg" className="w-full gap-2">
          <Mail className="size-4" />
          이메일로 시작
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <span className="h-px flex-1 bg-zinc-200" />
          또는
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogle}
            aria-label="Google로 계속하기"
            className="flex size-11 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-50"
          >
            <GoogleIcon />
          </button>
        </div>

        <p className="mt-8 text-xs text-zinc-400">
          실제 로그인은 inote-server의 Better Auth 연동 예정 — 지금은 Google 계정만 테스트 가능
        </p>
      </div>
    </div>
  );
}
