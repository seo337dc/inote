"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { rememberListUrl } from "@/shared/lib/list-url";

// 화면에 아무것도 그리지 않고, 글 목록이 보일 때마다 그 주소(필터·페이지·검색 포함)를 기록한다 —
// 글 상세의 "← 목록으로"가 어느 경로로 들어왔든 마지막으로 본 목록으로 돌아가게 하려는 것.
export default function ListUrlRecorder() {
  const pathname = usePathname();
  // 라우터 컨텍스트 밖(단위 테스트 등)에서는 두 훅이 null을 돌려준다 — 그때는 기록하지 않는다
  const search = useSearchParams()?.toString() ?? "";

  useEffect(() => {
    if (!pathname) return;
    rememberListUrl(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
