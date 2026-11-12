"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { MemoPad, resolveMemoTarget, type MemoTarget } from "@/entities/memo";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";

// 글 상세에서 "내 글인지"만 알면 되므로 작성자 id만 고른다
const OWNER_STALE_MS = 60_000;

/**
 * 어느 화면에서나 쓰는 메모장 하나 (계약: docs/todo/memo.md 3차). 루트 레이아웃의 ChatWorkspace `floating` 자리에 둔다.
 * - 대상은 경로가 정한다(resolveMemoTarget): 글·독서 상세는 그 글·독서 기록, 그 밖의 화면은 일반 메모. 관리자·메모 관리 화면은 숨긴다.
 * - 비로그인이면 숨긴다. 글 상세(/posts/:id)는 서버가 남의 글에는 메모를 못 만들게 막으므로 내 글일 때만 보인다(확인되기 전·조회 실패도 숨김).
 * - 글쓰기 화면(/write/:id)은 그 화면이 자기 상단 바에 메모장을 두므로 여기서는 그리지 않는다.
 * - 대상이 바뀌면 key로 새로 마운트한다 — 이전 대상의 메모는 언마운트 때 저장되고 새 대상을 불러온다. 같은 대상이면 그대로 둔다.
 * - 일반 메모 화면에 `?memo=ID`로 들어오면(메모 관리의 일반 메모 카드) 메모장이 열린 채 그 메모 탭을 보여준다.
 *   한 번 처리하면 주소에서 memo를 지워 새로고침해도 다시 열리지 않게 한다. 글·독서 화면에서는 무시한다.
 * - 버튼은 데스크톱에서만 보인다. 좁은 화면은 MemoPad가 도크의 + 메뉴에 스스로 등록한다.
 */
export default function GlobalMemoPad() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  // "이 메모를 열어 줘" 요청 — 메모장은 레이아웃에 계속 떠 있어서 클라이언트 이동으로 ?memo=가 나중에 생길 수 있다.
  // 요청이 올 때마다 seq를 올려 key를 바꿔 메모장을 새로 마운트한다(MemoPad는 처음 마운트 때만 openMemoId를 본다).
  // 마운트한 뒤에는 id를 비워 둔다 — 다른 화면에 갔다 돌아왔을 때 저절로 다시 열리지 않도록.
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
  const { data: session, isPending } = useSession();
  const target = resolveMemoTarget(pathname);
  const isWriteScreen = pathname.startsWith("/write/");
  const postId = target?.type === "post" && !isWriteScreen ? target.id : null;

  const owner = useQuery({
    queryKey: ["memo-post-owner", postId],
    queryFn: () => api.get<{ userId: string | null }>(`/blog/posts/${postId}`),
    select: (post) => post.userId,
    enabled: Boolean(postId) && Boolean(session),
    retry: false,
    staleTime: OWNER_STALE_MS,
  });

  const wantsOpen = target?.type === "general" ? request.id : undefined;
  useEffect(() => {
    if (!searchParams.has("memo")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("memo");
    window.history.replaceState(window.history.state, "", url);
  }, [searchParams]);

  if (isPending || !session || !target || isWriteScreen) return null;
  if (postId && owner.data !== session.user.id) return null;

  return (
    <div className="hidden lg:block">
      <MemoPad key={`${targetKey(target)}#${request.seq}`} target={target} openMemoId={wantsOpen} />
    </div>
  );
}

function targetKey(target: MemoTarget) {
  return target.type === "general" ? "general" : `${target.type}:${target.id}`;
}
