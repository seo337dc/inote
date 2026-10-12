"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";

type Props = {
  // 화면 끝에 가까워지면 불러올 다음 묶음을 요청한다
  onLoadMore: () => void;
  loading?: boolean;
  // 이 값이 바뀌면(보여 주는 개수가 늘면) 다시 살펴본다 — 새로 그린 뒤에도 끝이 화면 안이면 이어서 불러오도록
  watch: unknown;
};

// 무한 스크롤 — 목록 맨 끝의 보이지 않는 표시선이 화면(여유 200px)에 들어오면 onLoadMore를 부른다.
// IntersectionObserver가 없는 환경에서는 [더 보기] 버튼으로 대신한다.
export function LoadMoreSentinel({ onLoadMore, loading = false, watch }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onLoadMore);
  useEffect(() => {
    callback.current = onLoadMore;
  });
  const supported = typeof IntersectionObserver !== "undefined";

  useEffect(() => {
    const node = ref.current;
    if (!node || !supported || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [supported, loading, watch]);

  if (!supported) {
    return (
      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={onLoadMore} disabled={loading}>
          {loading ? "불러오는 중…" : "더 보기"}
        </Button>
      </div>
    );
  }

  return (
    <div ref={ref} className="py-4 text-center text-xs text-zinc-400" aria-live="polite">
      {loading ? "불러오는 중…" : ""}
    </div>
  );
}
