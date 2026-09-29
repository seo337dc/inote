"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 작성 중인 화면에서 다른 페이지로 나가기 전에 확인을 받기 위한 훅.
// Next.js 앱 라우터엔 라우트 이동을 막는 공식 API가 없어서:
//  - 앱 안의 링크 클릭은 document 캡처 단계에서 가로채 pendingHref로 보류하고(직접 다이얼로그를 띄움),
//  - 새로고침·탭 닫기·외부 링크는 브라우저 기본 beforeunload 확인창에 맡긴다.
// 브라우저 뒤로가기(popstate)는 막지 않는다.
export function useLeaveGuard(enabled: boolean, onLeave?: () => void) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);

  const cancel = useCallback(() => setPendingHref(null), []);

  const confirm = useCallback(() => {
    if (!pendingHref) return;
    onLeave?.();
    router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, onLeave, router]);

  return { isConfirming: pendingHref !== null, cancel, confirm };
}
