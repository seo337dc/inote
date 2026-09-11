"use client";

import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { InoteWordmark } from "@/shared/ui/inote-wordmark";
import { DEMO_ACCOUNT, type LoginFormState } from "../../model/useLoginForm";
import { useFieldRefs } from "../../model/useFieldRefs";
import GoogleIcon from "../GoogleIcon";

type Props = {
  form: LoginFormState;
};

export default function LoginMobile({ form }: Props) {
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    name,
    setName,
    submitting,
    passwordConfirmMismatch,
    focusSignal,
    handleGoogle,
    handleSubmit,
    toggleMode,
    fillDemoAccount,
  } = form;
  const { nameRef, emailRef, passwordRef, passwordConfirmRef } = useFieldRefs(focusSignal);

  return (
    <div className="flex min-h-dvh flex-col bg-white px-5 py-4">

      <div className="flex flex-1 flex-col justify-center py-8">
        {mode === "idle" ? (
          <>
            <div className="mb-10 text-center">
              <p className="mb-1 flex justify-center">
                <InoteWordmark className="text-2xl" />
              </p>
              <p className="text-sm text-zinc-500">
                노션처럼 쓰고, LLM과 함께 정리하는
                <br />
                나만의 기록 공간
              </p>
            </div>

            <Button onClick={() => setMode("login")} size="lg" className="w-full gap-2">
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
                className="flex size-12 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-50"
              >
                <GoogleIcon />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <h1 className="mb-4 text-center text-xl font-bold">
              이메일로 {mode === "signup" ? "회원가입" : "로그인"}
            </h1>

            {mode === "signup" && (
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름"
                className="rounded-lg border border-zinc-300 px-4 py-3.5 text-base outline-none focus:border-zinc-500"
              />
            )}
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              className="rounded-lg border border-zinc-300 px-4 py-3.5 text-base outline-none focus:border-zinc-500"
            />
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="rounded-lg border border-zinc-300 px-4 py-3.5 text-base outline-none focus:border-zinc-500"
            />
            {mode === "signup" && (
              <>
                <input
                  ref={passwordConfirmRef}
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="rounded-lg border border-zinc-300 px-4 py-3.5 text-base outline-none focus:border-zinc-500"
                />
                {passwordConfirm.length > 0 && (
                  <p
                    className={`text-xs ${
                      passwordConfirmMismatch ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {passwordConfirmMismatch
                      ? "비밀번호가 일치하지 않습니다"
                      : "비밀번호가 일치합니다"}
                  </p>
                )}
              </>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-2 w-full py-3.5 text-base"
            >
              {submitting ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="mt-2 text-center text-sm text-zinc-500"
            >
              {mode === "signup" ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
              <span className="font-semibold text-primary hover:underline">
                {mode === "signup" ? "로그인" : "회원가입"}
              </span>
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
        <p className="mb-1.5">둘러보고 싶으신가요? 테스트 계정으로 로그인해보세요.</p>
        <p className="mb-2 font-mono text-zinc-700">
          {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
        <button
          type="button"
          onClick={fillDemoAccount}
          className="font-medium text-primary hover:underline"
        >
          테스트 계정 자동 입력
        </button>
      </div>
    </div>
  );
}
