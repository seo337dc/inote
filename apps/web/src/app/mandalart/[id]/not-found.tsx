import Link from "next/link";

// mandalart/[id] 세그먼트 전용 not-found — posts/[id]/not-found.tsx와 동일한 패턴.
export default function MandalartItemNotFound() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="mb-2 text-lg font-semibold">존재하지 않는 항목입니다.</p>
      <p className="mb-6 text-sm text-zinc-500">삭제되었거나 잘못된 주소일 수 있어요.</p>
      <Link
        href="/dev-guide"
        className="inline-block rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        만다라트로 돌아가기
      </Link>
    </article>
  );
}
