"use client";

// 루트 레이아웃(RootLayout) 자체가 렌더링 중 깨졌을 때만 실행되는 최후의 안전망.
// error.tsx는 RootLayout 아래(children)만 대체하지만, 여긴 <html>/<body>까지 전부 직접 그려야 한다.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center text-zinc-900">
        <h1 className="text-2xl font-bold">문제가 발생했습니다.</h1>
        <p className="text-sm text-zinc-500">앱을 불러오는 중 오류가 발생했어요.</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
