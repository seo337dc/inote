"use client";

type Props = {
  // 다시 시도 — 보통 react-query의 refetch
  onRetry: () => void;
  message?: string;
};

// 목록·화면을 불러오지 못했을 때 로딩 화면 대신 보여주는 안내 + [다시 시도]
export default function LoadError({ onRetry, message = "불러오지 못했어요. 잠시 후 다시 시도해 주세요." }: Props) {
  return (
    <div role="alert" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-zinc-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </div>
  );
}
