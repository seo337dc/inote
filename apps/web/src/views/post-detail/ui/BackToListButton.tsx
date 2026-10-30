import Link from "next/link";

// 글 상세 맨 위의 "← 목록으로" 텍스트 링크. 항상 나의 글 목록(/my-posts)으로 간다.
// (예전에는 router.back()으로 직전 화면에 돌아갔는데, 글 작성·수정 직후나 외부에서 들어온 경우엔 목록이 아닌 곳으로 가버려서 바꿈)
export default function BackToListButton() {
  return (
    <Link href="/my-posts" className="mb-3 inline-block text-sm text-zinc-500 hover:text-zinc-900">
      ← 목록으로
    </Link>
  );
}
