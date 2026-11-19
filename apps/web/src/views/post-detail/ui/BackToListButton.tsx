"use client";

import { useRouter } from "next/navigation";
import { getLastListUrl } from "@/shared/lib/list-url";

// 글 상세 맨 위의 "← 목록으로" 텍스트 버튼. 이 탭에서 마지막으로 본 글 목록(홈·나의 글·작성자 목록, 카테고리 필터·페이지·검색 상태 그대로)으로 간다.
// router.back()은 쓰지 않는다 — 직전 화면이 다른 글 상세·/write·외부 사이트일 수 있다.
// 본 목록이 없으면(새 탭이나 주소로 바로 들어옴) 전체 글 목록(/)으로 간다.
export default function BackToListButton() {
  const router = useRouter();

  function handleClick() {
    router.push(getLastListUrl() ?? "/");
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
