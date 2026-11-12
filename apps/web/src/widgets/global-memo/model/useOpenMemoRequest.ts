"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * "이 메모를 열어 줘" 요청 — 메모 관리의 일반 메모 카드가 `/?memo=ID`로 보낸다.
 * 메모장은 레이아웃에 계속 떠 있어서 클라이언트 이동으로 ?memo=가 나중에 생길 수 있다. 요청이 올 때마다 seq를 올리므로
 * 쓰는 쪽은 seq를 key에 넣어 메모장을 새로 마운트한다(MemoPad는 처음 마운트 때만 openMemoId를 본다).
 * 마운트가 끝나면 id를 비운다(seq는 그대로) — 다른 화면에 갔다 돌아와도 저절로 다시 열리지 않도록.
 * 처리한 ?memo는 주소에서 지워 새로고침해도 다시 열리지 않게 한다(다른 쿼리는 그대로).
 */
export function useOpenMemoRequest(): { seq: number; id?: string } {
  const searchParams = useSearchParams();
  const memoParam = searchParams.get("memo");
  const [seenParam, setSeenParam] = useState<string | null>(null);
  const [request, setRequest] = useState<{ seq: number; id?: string }>({ seq: 0 });

  if (memoParam !== seenParam) {
    // 렌더 중 상태 갱신(React 권장 패턴) — 주소가 바뀐 것을 한 번만 요청으로 바꾼다. 주소에서 지워지면 seenParam도 비워 같은 카드를 또 눌러도 새 요청이 된다
    setSeenParam(memoParam);
    if (memoParam) setRequest((r) => ({ seq: r.seq + 1, id: memoParam }));
  }

  useEffect(() => {
    // 마운트가 끝난 뒤 요청 id를 비운다 — seq는 그대로라 메모장은 다시 마운트되지 않는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (request.id) setRequest((r) => ({ seq: r.seq }));
  }, [request]);

  useEffect(() => {
    if (!searchParams.has("memo")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("memo");
    window.history.replaceState(window.history.state, "", url);
  }, [searchParams]);

  return request;
}
