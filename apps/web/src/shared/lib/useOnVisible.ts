"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  /** false면 관찰하지 않는다 (예: 다음 페이지가 없거나 이미 불러오는 중). 기본 true */
  enabled?: boolean;
  /** 화면에 닿기 전에 미리 부르려면 (예: "400px") */
  rootMargin?: string;
  /**
   * 바뀔 때마다 관찰을 새로 시작한다. 새 페이지를 붙인 뒤에도 요소가 여전히 화면 안에 있으면
   * 옵저버가 "이미 보이는 상태"라 새 이벤트를 주지 않으므로, 목록 길이 같은 값을 넣어 다시 확인하게 한다.
   */
  watch?: unknown;
};

/**
 * 요소가 화면에 보이면 onVisible을 부른다 — 무한 스크롤의 "목록 끝" 감지용.
 * 돌려준 ref 콜백을 끝 표시 요소에 붙인다. onVisible은 최신 것을 부르므로 매 렌더 새로 만들어도 된다.
 * IntersectionObserver가 없는 환경(구형 브라우저·테스트)에서는 아무것도 하지 않는다.
 */
export function useOnVisible<T extends Element>(onVisible: () => void, { enabled = true, rootMargin, watch }: Options = {}) {
  const [element, setElement] = useState<T | null>(null);
  const latest = useRef(onVisible);
  useEffect(() => {
    latest.current = onVisible;
  });

  useEffect(() => {
    if (!enabled || !element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) latest.current();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, enabled, rootMargin, watch]);

  return useCallback((el: T | null) => setElement(el), []);
}
