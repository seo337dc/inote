import Link from "next/link";

// posts/[id] 세그먼트 전용 not-found — 루트 not-found.tsx보다 우선 적용되어
// 글 상세 페이지의 레이아웃(article 폭 등)을 그대로 유지한 채 메시지만 보여준다.
export default function PostNotFound() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-16 text-center">
      <p className="mb-2 text-lg font-semibold">존재하지 않는 글입니다.</p>
      <p className="mb-6 text-sm text-zinc-500">삭제되었거나 잘못된 주소일 수 있어요.</p>
      <Link
        href="/"
        className="inline-block rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        홈으로
      </Link>
    </article>
  );
}
