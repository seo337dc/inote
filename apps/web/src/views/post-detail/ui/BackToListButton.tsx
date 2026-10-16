"use client";

import { useRouter } from "next/navigation";

// 글 상세 맨 위의 "← 목록으로" 텍스트 버튼. 직전 화면(홈·나의 글·작성자 목록·카테고리 필터·페이지·검색 상태 그대로)으로 돌아가고,
// 돌아갈 화면이 없으면(새 탭이나 주소로 바로 들어옴) 전체 글 목록(/)으로 간다.
export default function BackToListButton() {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mb-3 text-sm text-zinc-500 hover:text-zinc-900"
    >
      ← 목록으로
    </button>
  );
}
