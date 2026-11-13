"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
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
 * - 버튼은 데스크톱에서만 보인다. 좁은 화면은 MemoPad가 도크의 + 메뉴에 스스로 등록한다.
 */
export default function GlobalMemoPad() {
  const pathname = usePathname() ?? "/";
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

  if (isPending || !session || !target || isWriteScreen) return null;
  if (postId && owner.data !== session.user.id) return null;

  return (
    <div className="hidden lg:block">
      <MemoPad key={targetKey(target)} target={target} />
    </div>
  );
}

function targetKey(target: MemoTarget) {
  return target.type === "general" ? "general" : `${target.type}:${target.id}`;
}
