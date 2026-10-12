"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  TEMP_ID_PREFIX,
  useCreateRoutine,
  useDeleteRoutine,
  useRenameRoutine,
  useRoutines,
  type Routine,
} from "@/entities/daily";
import { useSession } from "@/shared/lib/auth-client";
import { todayKst } from "@/shared/lib/date";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { PageLoading } from "@/shared/ui/page-loading";

// 설정 — 고정 리스트(매일 할 일) 관리. 오늘의 할일 탭에서 [오늘 할일 생성]을 누르면 이 목록이 오늘 카드로 들어간다.
export default function RoutineSettingsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-bold">고정 리스트</h1>
        <Link href="/todos" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-4" />
          할 일로
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">
        매일 하는 일을 적어 두세요. 오늘의 할일에서 [오늘 할일 생성]을 누르면 이 목록이 오늘 카드로 들어와요.
      </p>
      <RoutineList />
    </div>
  );
}

function RoutineList() {
  const { data: routines, isPending, isError } = useRoutines();
  const createRoutine = useCreateRoutine();
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    createRoutine.mutate({ title: trimmed }, { onError: () => toast.error("고정 항목을 추가하지 못했어요.") });
    setTitle("");
  }

  if (isPending) return <p className="py-10 text-center text-sm text-zinc-400">불러오는 중…</p>;
  if (isError || !routines) {
    return <p className="py-10 text-center text-sm text-zinc-500">고정 리스트를 불러오지 못했어요.</p>;
  }

  return (
    <section aria-label="고정 리스트" className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {routines.length > 0 ? (
        <ul className="divide-y divide-zinc-50">
          {routines.map((routine) => (
            <RoutineRow key={routine.id} routine={routine} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">아직 고정 항목이 없어요.</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 border-t border-zinc-100 px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="매일 할 일 입력..."
          aria-label="고정 항목 입력"
          maxLength={200}
          className="min-w-0 flex-1 rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400"
        />
        <button type="submit" className="shrink-0 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800">
          추가
        </button>
      </form>

      <p className="border-t border-zinc-100 bg-zinc-50/70 px-4 py-2 text-xs text-zinc-500">
        {routines.length === 0 ? "고정 항목 0개" : `고정 항목 ${routines.length}개`}
      </p>
    </section>
  );
}

function RoutineRow({ routine }: { routine: Routine }) {
  const renameRoutine = useRenameRoutine();
  const deleteRoutine = useDeleteRoutine();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(routine.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // 서버가 진짜 id를 주기 전(낙관적으로 먼저 보여준 항목)에는 조작할 수 없다
  const pending = routine.id.startsWith(TEMP_ID_PREFIX);

  function commitRename() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === routine.title) {
      setDraft(routine.title);
      return;
    }
    renameRoutine.mutate(
      { routineId: routine.id, title: next, today: todayKst() },
      { onError: () => toast.error("이름을 바꾸지 못했어요.") },
    );
  }

  function confirmDelete() {
    setConfirmingDelete(false);
    deleteRoutine.mutate(
      { routineId: routine.id, today: todayKst() },
      { onError: () => toast.error("고정 항목을 삭제하지 못했어요.") },
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(routine.title);
            }
          }}
          maxLength={200}
          aria-label="고정 항목 이름"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500"
        />
      ) : (
        <span className="min-w-0 flex-1 break-words text-sm text-zinc-900">{routine.title}</span>
      )}

      {!pending && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${routine.title} 메뉴`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setDraft(routine.title);
                setEditing(true);
              }}
            >
              이름 수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmingDelete(true)}>삭제</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {confirmingDelete && (
        <Dialog open onOpenChange={(next) => !next && setConfirmingDelete(false)}>
          <DialogContent>
            <DialogTitle>고정 항목을 삭제할까요?</DialogTitle>
            <DialogDescription>
              &apos;{routine.title}&apos;은(는) 오늘부터 오늘 할일 생성에서 빠져요. 지난 기록은 그대로 남아요.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                취소
              </Button>
              <Button type="button" onClick={confirmDelete}>
                삭제
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}
