"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useArchivePosts } from "@/entities/post";

type Props = {
  // 지금 보는 화면이 보관함이면 "보관 해제", 나의 글이면 "보관"
  archived: boolean;
  selectedIds: string[];
  // 현재 화면에 보이는 글 id (페이지 전체 선택용)
  pageIds: string[];
  onSelectPage: (ids: string[]) => void;
  onClear: () => void;
  // 처리가 끝났을 때(선택 모드를 닫을 때) 부른다
  onDone: () => void;
};

// 선택한 글을 한꺼번에 보관하거나 보관 해제하는 막대. 선택 모드에서만 화면 아래에 붙는다.
export default function ArchiveActionBar({ archived, selectedIds, pageIds, onSelectPage, onClear, onDone }: Props) {
  const router = useRouter();
  const mutation = useArchivePosts();
  const count = selectedIds.length;
  const actionLabel = archived ? "보관 해제" : "보관";

  function handleRun() {
    mutation.mutate(
      { ids: selectedIds, archived: !archived },
      {
        onSuccess: (doneIds) => {
          toast.success(
            archived ? `${doneIds.length}개의 글을 보관 해제했어요.` : `${doneIds.length}개의 글을 보관함으로 옮겼어요.`,
          );
          // 홈 목록은 서버에서 그려서(캐시 없음) 다시 불러오게 한다
          router.refresh();
          onDone();
        },
        onError: () => toast.error(`${actionLabel}하지 못했어요. 잠시 후 다시 시도해 주세요.`),
      },
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="선택한 글 작업"
      className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm"
    >
      <span className="font-medium">{count}개 선택됨</span>
      <button
        type="button"
        onClick={() => onSelectPage(pageIds)}
        className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100"
      >
        이 페이지 전체 선택
      </button>
      {count > 0 && (
        <button type="button" onClick={onClear} className="rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100">
          선택 해제
        </button>
      )}
      <button
        type="button"
        onClick={handleRun}
        disabled={count === 0 || mutation.isPending}
        className="ml-auto rounded bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {mutation.isPending ? "처리 중..." : `${actionLabel}하기`}
      </button>
    </div>
  );
}
