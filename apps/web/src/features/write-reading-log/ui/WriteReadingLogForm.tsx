"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { PostEditor } from "@/shared/ui/editor";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import { useLeaveGuard } from "@/shared/lib/useLeaveGuard";
import { LeaveConfirmDialog } from "@/shared/ui/leave-confirm-dialog";
import type { ReadingLog } from "@/entities/reading-log";
import { useMyReadingLogDrafts } from "@/entities/reading-log";
import ReadingLogAccessDenied from "./ReadingLogAccessDenied";

type Props = {
  id: string | null;
};

type ReadingLogBody = {
  title: string;
  author: string;
  startedAt: string;
  finishedAt: string;
  coverImageUrl: string;
  content: string;
};

export default function WriteReadingLogForm({ id }: Props) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  // 새 기록(id 없음)으로 들어오면: 블로그 글쓰기와 달리 여러 draft 중 고르는 모달 없이,
  // 가장 최근 draft가 있으면 그걸로 바로 이어쓰고, 없으면 새로 만든다 — 독서 기록은
  // 보통 "지금 읽는 책 하나"만 진행 중이라 이 정도 단순화로 충분하다고 판단.
  const hasResolvedDraft = useRef(false);
  const myDraftsQuery = useMyReadingLogDrafts();
  const createDraftMutation = useMutation({
    mutationFn: () => api.post<ReadingLog>("/reading-logs/draft", {}),
    onSuccess: (draft) => router.replace(`/reading/write?id=${draft.id}`),
  });

  useEffect(() => {
    if (id || isSessionPending || !session || hasResolvedDraft.current) return;
    if (!myDraftsQuery.isSuccess) return;
    hasResolvedDraft.current = true;
    const mostRecentDraft = myDraftsQuery.data[0];
    if (mostRecentDraft) {
      router.replace(`/reading/write?id=${mostRecentDraft.id}`);
    } else {
      createDraftMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSessionPending, session, myDraftsQuery.isSuccess, myDraftsQuery.data]);

  const readingLogQuery = useQuery({
    queryKey: ["reading-log", id],
    queryFn: () => api.get<ReadingLog>(`/reading-logs/${id}`),
    enabled: Boolean(id) && Boolean(session),
    retry: false,
    // 열 때 한 번만 가져와 폼 상태로 쓰고 캐시 재사용은 안 함 — 저장 직후 다시 열었을 때 옛 내용이
    // 뜨면 자동저장이 새 내용을 덮어쓴다.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const readingLog = readingLogQuery.data;
  const isOwn = !readingLog || session?.user.id === readingLog.userId;

  useEffect(() => {
    if (isSessionPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (readingLog && !isOwn) {
      router.replace(`/reading/${readingLog.id}`);
    }
  }, [isSessionPending, session, readingLog, isOwn, router]);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [content, setContent] = useState("");
  // 사용자가 직접 고친 게 있는지 — 입력 핸들러에서만 켜고, 저장·삭제하면 꺼서 그 이동은 확인창 없이 보낸다.
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedId = useRef<string | null>(null);
  const skipNextAutosave = useRef(true);
  useEffect(() => {
    if (!readingLog || loadedId.current === readingLog.id) return;
    loadedId.current = readingLog.id;
    skipNextAutosave.current = true;
    setTitle(readingLog.title);
    setAuthor(readingLog.author ?? "");
    setStartedAt(readingLog.startedAt?.slice(0, 10) ?? "");
    setFinishedAt(readingLog.finishedAt?.slice(0, 10) ?? "");
    setCoverImageUrl(readingLog.coverImageUrl ?? "");
    setContent(readingLog.content);
  }, [readingLog]);

  const [autosavedAt, setAutosavedAt] = useState<Date | null>(null);
  const autosaveMutation = useMutation({
    mutationFn: (body: ReadingLogBody) => api.patch(`/reading-logs/${id}`, body),
    onSuccess: () => setAutosavedAt(new Date()),
  });

  useEffect(() => {
    if (!readingLog) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      autosaveMutation.mutate({ title, author, startedAt, finishedAt, coverImageUrl, content });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, author, startedAt, finishedAt, coverImageUrl, content, readingLog]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/uploads/image", file),
    onSuccess: (result) => {
      setCoverImageUrl(result.url);
      setIsDirty(true);
    },
    onError: () => setError("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요."),
  });

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 골라도 onChange가 또 발동하도록
    if (file) uploadMutation.mutate(file);
  }

  const saveMutation = useMutation({
    mutationFn: (body: ReadingLogBody) =>
      api.patch<ReadingLog>(`/reading-logs/${id}`, { ...body, publish: true }),
    onSuccess: (saved) => {
      setIsDirty(false);
      router.push(`/reading/${saved.id}`);
    },
    onError: () => setError("저장에 실패했습니다. 잠시 후 다시 시도해주세요."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/reading-logs/${id}`),
    onSuccess: () => {
      setIsDirty(false);
      router.push("/reading");
    },
    onError: () => setError("삭제에 실패했습니다. 잠시 후 다시 시도해주세요."),
  });

  // 나갈 때 1.5초 디바운스에 걸려 있던 마지막 수정이 유실되지 않도록 바로 임시저장
  const leaveGuard = useLeaveGuard(isDirty, () =>
    autosaveMutation.mutate({ title, author, startedAt, finishedAt, coverImageUrl, content }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate({ title, author, startedAt, finishedAt, coverImageUrl, content });
  }

  function handleDelete() {
    if (!window.confirm("정말 삭제하시겠어요? 되돌릴 수 없습니다.")) return;
    setError(null);
    deleteMutation.mutate();
  }

  if (isSessionPending || !session) return null;
  if (!id) return null; // draft 확인/생성 중
  if (readingLogQuery.isError) return <ReadingLogAccessDenied />;
  if (!readingLog || !isOwn) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {readingLog.publishedAt ? "독서 기록 수정" : "독서 기록 작성"}
      </h1>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0">
          <input
            id="cover-image-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverChange}
            className="hidden"
          />
          {coverImageUrl ? (
            <div className="relative size-32">
              {/* eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시 */}
              <img
                src={coverImageUrl}
                alt="책 표지"
                className="size-32 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setCoverImageUrl("");
                  setIsDirty(true);
                }}
                aria-label="표지 이미지 삭제"
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="cover-image-input"
              className="flex size-32 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500"
            >
              <ImagePlus className="size-6" />
              <span className="text-xs">
                {uploadMutation.isPending ? "업로드 중..." : "책 표지"}
              </span>
            </label>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="책 제목"
            className="w-full min-w-0 border-b border-zinc-200 pb-2 text-2xl font-bold outline-none"
          />
          <input
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setIsDirty(true);
            }}
            placeholder="작가"
            className="w-full min-w-0 rounded border border-zinc-300 px-3 py-1.5 text-sm outline-none"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <input
              type="date"
              value={startedAt}
              onChange={(e) => {
                setStartedAt(e.target.value);
                setIsDirty(true);
              }}
              className="min-w-0 rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none"
            />
            <span>~</span>
            <input
              type="date"
              value={finishedAt}
              onChange={(e) => {
                setFinishedAt(e.target.value);
                setIsDirty(true);
              }}
              className="min-w-0 rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <PostEditor content={content} onChange={setContent} onUserEdit={() => setIsDirty(true)} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              className="rounded bg-red-600 px-5 py-2 text-white hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </button>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
              disabled={!title.trim() || saveMutation.isPending || deleteMutation.isPending}
            >
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
          {(autosaveMutation.isPending || autosavedAt) && (
            <p className="text-xs text-zinc-400">
              {autosaveMutation.isPending
                ? "임시 저장 중..."
                : `임시 저장됨 · ${autosavedAt!.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          )}
        </div>
      </div>
      <LeaveConfirmDialog
        open={leaveGuard.isConfirming}
        onStay={leaveGuard.cancel}
        onLeave={leaveGuard.confirm}
      />
    </form>
  );
}
