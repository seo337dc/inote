export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-2 text-2xl font-bold">로그인</h1>
      <p className="mb-8 text-sm text-zinc-500">
        inote-server의 계정으로 로그인합니다. (Better Auth 연동 전 — 버튼 UI만)
      </p>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          className="rounded border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50"
        >
          Google로 계속하기
        </button>
        <button
          type="button"
          className="rounded border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-50"
        >
          Naver로 계속하기
        </button>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        실제 인증 연동은 inote-server의 Better Auth를 그대로 재사용 예정
      </p>
    </div>
  );
}
