"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageLoading } from "@/shared/ui/page-loading";
import { LoadError } from "@/shared/ui/load-error";
import { useSession } from "@/shared/lib/auth-client";
import { useOnVisible } from "@/shared/lib/useOnVisible";
import { MemoPad, syncMemoGroupsAfterEdit, useMemoGroups, type MemoGroup, type MemoTarget, type MemoTargetType } from "@/entities/memo";
import MemoGroupCard from "./MemoGroupCard";

type Tab = "all" | MemoTargetType;

// 목록 끝에 닿기 이만큼 전에 다음 페이지를 미리 받는다(스크롤이 멈추지 않고 이어지도록)
const LOAD_AHEAD_MARGIN = "600px";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "general", label: "일반" },
  { key: "post", label: "글" },
  { key: "reading", label: "독서" },
];

// 카드의 대상 → 메모장이 다룰 대상 (일반 메모는 대상이 없다)
function targetOf(group: MemoGroup): MemoTarget {
  return group.targetType === "general" ? { type: "general" } : { type: group.targetType, id: group.targetId };
}

/**
 * 메모 관리 — 내 메모를 전체/일반/글/독서 탭으로 모아 카드로 본다 (계약: docs/todo/memo.md 4차).
 * 서버가 대상(글·독서)별로 묶고 일반 메모는 한 장씩 그룹으로 준다. 탭을 누르면 그 종류로 다시 불러온다.
 * 카드의 메모를 누르면 그 메모를 선택한 큰 메모장(MemoPad standalone)이 열리고, 닫으면 저장이 끝난 뒤 그 대상의 메모만 받아 카드에 반영한다.
 * 탭 숫자는 보이지 않는다(무한 스크롤에서는 전체 개수를 화면이 모른다 — 후속).
 */
export default function MemosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } = useSession();
  const [tab, setTab] = useState<Tab>("all");
  // 열려 있는 메모장 — 카드에서 누른 메모(memoId)와 그 대상
  const [opened, setOpened] = useState<{ target: MemoTarget; memoId: string } | null>(null);
  const { groups, isPending, isError, refetch, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = useMemoGroups(
    tab === "all" ? undefined : tab,
  );
  // 목록 끝(센티널)이 화면 가까이 오면 다음 페이지를 받는다. 받는 중이거나 이번 페이지가 실패해 멈춘 동안(자동 재시도 방지)에는 관찰하지 않는다.
  // groups.length를 watch에 넣어, 새 페이지를 붙인 뒤에도 끝이 여전히 보이면 이어서 받는다.
  const sentinelRef = useOnVisible<HTMLDivElement>(() => void fetchNextPage(), {
    enabled: hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
    rootMargin: LOAD_AHEAD_MARGIN,
    watch: groups.length,
  });

  useEffect(() => {
    if (!isSessionPending && !session) router.replace("/login");
  }, [isSessionPending, session, router]);

  const ready = !isSessionPending && Boolean(session);

  // 메모장이 닫히고 입력 저장이 끝난 뒤에 불린다 — 고친 대상의 메모만 한 번 받아 받아 둔 목록에 반영한다
  // (지금까지 받은 모든 페이지를 다시 요청하지 않는다. 받지 못하면 목록을 다시 불러온다)
  function handlePadClosed() {
    const closing = opened;
    setOpened(null);
    if (closing) void syncMemoGroupsAfterEdit(queryClient, closing.target);
  }

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
              className={`-mb-px cursor-pointer border-b-2 px-1 pb-2 text-sm ${
                selected ? "border-zinc-900 font-semibold text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {!ready || isPending ? (
        <PageLoading />
      ) : isError && groups.length === 0 ? (
        <LoadError onRetry={() => void refetch()} />
      ) : groups.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">메모가 없어요.</p>
      ) : (
        // [overflow-anchor:none]: 메모장에서 고친 카드가 맨 앞으로 옮겨질 때 브라우저의 스크롤 앵커링이 그 카드를 따라 맨 위로 끌고 가지 않게 한다
        <ul className="grid grid-cols-2 gap-x-1 gap-y-1 [overflow-anchor:none] sm:grid-cols-3 lg:grid-cols-4">
          {groups.map((group) => (
            <li key={group.key} className="min-w-0">
              <MemoGroupCard group={group} onOpenMemo={(memoId) => setOpened({ target: targetOf(group), memoId })} />
            </li>
          ))}
        </ul>
      )}
      {ready && groups.length > 0 && (
        <div className="py-8 text-center text-sm text-zinc-500">
          {isFetchNextPageError ? (
            <div className="flex flex-col items-center gap-2">
              <p>더 불러오지 못했어요.</p>
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1 text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                다시 시도
              </button>
            </div>
          ) : isFetchingNextPage ? (
            <p role="status">불러오는 중…</p>
          ) : hasNextPage ? (
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          ) : (
            <p>모든 메모를 확인했어요.</p>
          )}
        </div>
      )}
      {opened && <MemoPad key={opened.memoId} target={opened.target} openMemoId={opened.memoId} standalone onClose={handlePadClosed} />}
    </div>
  );
}
