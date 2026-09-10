import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-bold leading-snug">존재하지 않는 페이지입니다.</h1>
      <p className="text-sm text-zinc-500">주소를 다시 확인하시거나, 홈으로 돌아가주세요.</p>
      <Link
        href="/"
        className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        홈으로
      </Link>
    </div>
  );
}
