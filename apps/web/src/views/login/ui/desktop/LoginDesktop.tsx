import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { InoteWordmark } from "@/shared/ui/inote-wordmark";
import GoogleIcon from "@/shared/ui/GoogleIcon";
import { DEMO_ACCOUNT, type LoginFormState } from "../../model/useLoginForm";
import { useFieldRefs } from "../../model/useFieldRefs";

type Props = {
  form: LoginFormState;
};

export default function LoginDesktop({ form }: Props) {
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
    goToIdle,
    toggleMode,
    loginDemoAccount,
  } = form;
  const { nameRef, emailRef, passwordRef, passwordConfirmRef } = useFieldRefs(focusSignal);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
        <div className="mb-8 text-center">
          <p className="mb-1 flex justify-center">
            <InoteWordmark className="text-2xl" />
          </p>
          <p className="text-sm text-zinc-500">
            노션처럼 쓰고, LLM과 함께 정리하는 나만의 기록 공간
          </p>
        </div>

        {mode === "idle" ? (
          <>
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
                className="flex size-11 items-center justify-center rounded-full border border-zinc-200 hover:bg-zinc-50"
              >
                <GoogleIcon />
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <h1 className="text-lg font-semibold">
              {mode === "signup" ? "회원가입" : "로그인"}
            </h1>

            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  이름<span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                이메일 주소<span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                비밀번호<span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
              {mode === "signup" && (
                <p className="text-xs text-zinc-400">8자 이상</p>
              )}
            </div>

            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="passwordConfirm" className="text-sm font-medium">
                  비밀번호 확인<span className="text-red-500">*</span>
                </label>
                <input
                  id="passwordConfirm"
                  ref={passwordConfirmRef}
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="rounded border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
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
              </div>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
            </Button>

            <div className="flex flex-col items-center gap-1">
              <button type="button" onClick={toggleMode} className="text-xs text-zinc-500">
                {mode === "signup" ? "이미 계정이 있으신가요? " : "계정이 없으신가요? "}
                <span className="font-semibold text-primary hover:underline">
                  {mode === "signup" ? "로그인" : "회원가입"}
                </span>
              </button>
              <button
                type="button"
                onClick={goToIdle}
                className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline"
              >
                ← 다른 방법으로 로그인
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
        <p className="mb-1.5">둘러보고 싶으신가요? 테스트 계정으로 로그인해보세요.</p>
        <p className="mb-2 font-mono text-zinc-700">
          {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={submitting}
          onClick={loginDemoAccount}
        >
          {submitting ? "로그인 중..." : "테스트 계정으로 로그인"}
        </Button>
      </div>
    </div>
  );
}
