"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/shared/ui/page-loading";
import { LoadError } from "@/shared/ui/load-error";
import { formatDateTime } from "@/shared/lib/date";
import { useSession } from "@/shared/lib/auth-client";
import { useAllMemos, type Memo, type MemoTargetType } from "@/entities/memo";

type Tab = "all" | MemoTargetType;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "general", label: "일반" },
  { key: "post", label: "글" },
  { key: "reading", label: "독서" },
];
const TYPE_LABEL: Record<MemoTargetType, string> = { general: "일반", post: "글", reading: "독서" };

// 카드를 누르면 가는 곳 — 글·독서는 그 화면, 일반 메모는 홈에서 메모장이 그 메모를 열도록 id를 실어 보낸다
function hrefOf(memo: Memo): string {
  if (memo.targetType === "post") return `/posts/${memo.targetId}`;
  if (memo.targetType === "reading") return `/reading/${memo.targetId}`;
  return `/?memo=${memo.id}`;
}

/**
 * 메모 관리 — 내 메모를 전체/일반/글/독서 탭으로 모아 카드로 본다 (계약: docs/todo/memo.md 3차).
 * 서버가 최근 수정순으로 준 전체를 한 번 불러와 탭은 화면에서 거른다. 카드를 누르면 대상(글·독서·메모장)으로 이동한다.
 * 편집·삭제는 메모장에서 하므로 이 화면은 읽기 전용이다.
 */
export default function MemosPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();
  const { data: memos, isPending, isError, refetch } = useAllMemos();
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    if (!isSessionPending && !session) router.replace("/login");
  }, [isSessionPending, session, router]);

  if (!isSessionPending && session && isError && !memos) {
    return <LoadError onRetry={() => void refetch()} />;
  }
  if (isSessionPending || !session || isPending || !memos) {
    return <PageLoading />;
  }

  const countOf = (key: Tab) => (key === "all" ? memos.length : memos.filter((m) => m.targetType === key).length);
  const shown = tab === "all" ? memos : memos.filter((m) => m.targetType === tab);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-10">
      <h1 className="mb-4 text-xl font-bold">메모 관리</h1>
      <div role="tablist" aria-label="메모 종류" className="mb-6 flex gap-4 border-b border-zinc-200">
        {TABS.map(({ key, label }) => {
          const selected = key === tab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(key)}
              className={`-mb-px flex cursor-pointer items-baseline gap-1.5 border-b-2 px-1 pb-2 text-sm ${
                selected ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {label}
              <span className={`text-xs ${selected ? "text-red-500" : "text-zinc-400"}`}>{countOf(key)}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">메모가 없어요.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((memo) => (
            <li key={memo.id} className="min-w-0">
              <MemoCard memo={memo} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 메모장과 같은 색(globals.css의 memo 토큰)을 쓴 정사각형 카드 — 위쪽 띠는 메모장 헤더, 몸통은 메모장 바탕색
function MemoCard({ memo }: { memo: Memo }) {
  return (
    <Link
      href={hrefOf(memo)}
      className="bg-memo text-memo-foreground border-memo-border hover:border-memo-muted flex aspect-square flex-col overflow-hidden rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="bg-memo-header border-memo-border flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <span className="bg-memo-border/60 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium">{TYPE_LABEL[memo.targetType]}</span>
        {memo.targetTitle && <span className="text-memo-muted min-w-0 truncate text-xs">{memo.targetTitle}</span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <h2 className="shrink-0 truncate text-sm font-semibold">{memo.title.trim() || "제목 없음"}</h2>
        <p className="text-memo-muted mt-1.5 line-clamp-6 min-h-0 flex-1 overflow-hidden text-sm leading-relaxed whitespace-pre-line">
          {memo.content.trim() || "내용 없음"}
        </p>
        <p className="text-memo-muted/80 mt-2 shrink-0 text-xs">{formatDateTime(memo.updatedAt)}</p>
      </div>
    </Link>
  );
}
