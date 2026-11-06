"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMemos } from "../api/memos";
import { MemoSaver } from "./memoSaver";
import { memosKey } from "./queryKeys";
import type { MemoSaveStatus, MemoTarget } from "./types";

/**
 * 대상(글·독서 기록)의 메모 한 장을 불러와 편집하고 자동저장한다.
 * - 불러오기가 끝나기 전(ready=false)에는 편집하면 안 된다 — 서버에 이미 있는 메모가 있는데 새로 만들어 중복되는 일을 막는다.
 *   불러오기에 실패해도 ready는 false로 남는다(저장하지 않는다).
 * - target은 컴포넌트가 떠 있는 동안 바뀌지 않는다고 가정한다(대상이 바뀌면 새로 마운트).
 * - 화면을 열 때마다 서버 값을 새로 가져오고(캐시 재사용 안 함) 포커스로 다시 가져오지도 않는다 — 입력 중인 내용을 덮어쓰지 않으려고.
 */
export function useMemoDraft(target: MemoTarget, options: { delayMs?: number } = {}) {
  const { delayMs } = options;
  const query = useQuery({
    queryKey: memosKey(target),
    queryFn: () => getMemos(target),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // 재연결로 다시 불러오면 saver가 새로 만들어져 입력 중인 내용과 어긋날 수 있다
  });
  const [draft, setDraft] = useState<string | null>(null); // null = 아직 직접 고친 적 없음
  const [status, setStatus] = useState<MemoSaveStatus>("idle");
  const saverRef = useRef<MemoSaver | null>(null);

  useEffect(() => {
    if (!query.isSuccess) return;
    const saver = new MemoSaver({ target, memo: query.data[0] ?? null, delayMs, onStatus: setStatus });
    saverRef.current = saver;
    return () => {
      saver.flush(); // 화면을 떠날 때 기다리던 변경을 보낸다
      saverRef.current = null;
    };
    // target은 마운트 동안 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.data, delayMs]);

  const text = draft ?? query.data?.[0]?.content ?? "";

  const setText = useCallback((value: string) => {
    setDraft(value);
    saverRef.current?.update(value);
  }, []);

  const flush = useCallback(() => saverRef.current?.flush(), []);

  return { text, setText, ready: query.isSuccess, loadFailed: query.isError, status, flush };
}
