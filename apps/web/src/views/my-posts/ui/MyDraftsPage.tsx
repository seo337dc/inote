"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/shared/ui/page-loading";
import { LoadError } from "@/shared/ui/load-error";
import { formatDateTime } from "@/shared/lib/date";
import { useSession } from "@/shared/lib/auth-client";
import { previewText, useMyDrafts, type Post } from "@/entities/post";
import MyPostsTabs from "./MyPostsTabs";

/**
 * 나의 글의 [임시저장] 탭 — 발행 전 글(draft)만 최근 수정순으로 모아 본다(서버가 그 순서로 준다).
 * 글을 누르면 이어 쓰는 화면(/write/:id)으로 간다. 나의 글처럼 카테고리 필터·검색·페이지는 없다
 * (GET /blog/posts/mine/drafts가 전부 한 번에 내려준다 — 계약: docs/todo/post-unpublish.md).
 */
export default function MyDraftsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: drafts, isPending, isError, refetch } = useMyDrafts();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  // 불러오기에 실패했는데 보여줄 이전 목록도 없으면 로딩 화면에 갇히지 않고 안내 + 다시 시도
  if (!isSessionPending && session && isError && !drafts) {
    return <LoadError onRetry={() => void refetch()} />;
  }

  if (isSessionPending || !session || isPending || !drafts) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-6 lg:px-6 lg:py-10">
      {/* 나의 글·보관함의 카테고리 필터 자리를 비워 둔다 — 탭 줄이 탭을 오갈 때 옆으로 튀지 않게 (같은 폭 w-40) */}
      <div aria-hidden className="hidden w-40 shrink-0 lg:block" />
      <div className="min-w-0 flex-1">
      <div className="mb-3">
        <MyPostsTabs current="drafts" />
      </div>
      <div className="mb-6 flex items-baseline gap-1.5 border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-bold">임시저장</h1>
        <span className="text-xl font-bold text-red-500">{drafts.length}</span>
      </div>

      {drafts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-zinc-500">임시저장한 글이 없어요.</p>
          <p className="mt-1 text-sm text-zinc-400">글 상세의 [⋯] 메뉴에서 발행한 글을 임시저장으로 바꿀 수 있어요.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <DraftCard draft={draft} />
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}

function DraftCard({ draft }: { draft: Post }) {
  return (
    <Link
      href={`/write/${draft.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <h2 className="truncate text-lg font-semibold">{draft.title.trim() || "제목 없음"}</h2>
      <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{previewText(draft.content)}</p>
      <p className="mt-3 text-xs text-zinc-400">최종 수정 {formatDateTime(draft.updatedAt)}</p>
    </Link>
  );
}
