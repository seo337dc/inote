"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCategories, buildCategoryTree, flattenCategoryTree } from "@/entities/category";
import { PostEditor } from "@/shared/ui/editor";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import { useLeaveGuard } from "@/shared/lib/useLeaveGuard";
import { LeaveConfirmDialog } from "@/shared/ui/leave-confirm-dialog";
import type { Post } from "@/entities/post";
import { PostAiSummary, useMyDrafts } from "@/entities/post";
import PostAccessDenied from "./PostAccessDenied";
import DraftListModal from "./DraftListModal";
import PublishScreen from "./PublishScreen";

const FORM_ID = "write-post-form";
const EMPTY_CONTENT = ["", "<p></p>"];

type Props = {
  id: string | null;
};

type PostBody = {
  title: string;
  category: string;
  content: string;
  isPrivate: boolean;
  pinned: boolean;
  // 빈 문자열이면 썸네일 없음 → 서버에는 null로 보내 지운다
  thumbnailUrl: string | null;
};

export default function WritePostForm({ id }: Props) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  // 새 글(id 없음)로 들어오면: 이어 쓸 draft가 있는지 먼저 확인.
  // 있으면 모달로 고르게 하고, 없거나 "새로 작성하기"를 고르면 그때 빈 draft를 만들어
  // 그 id로 URL을 바꿔치기. StrictMode 이중 렌더링에서 draft가 두 번 생기지 않도록
  // ref로 한 번만 실행되게 막음.
  const [startNewAnyway, setStartNewAnyway] = useState(false);

  const myDraftsQuery = useMyDrafts();
  const myDrafts = myDraftsQuery.data ?? [];
  const shouldPickDraft = !id && myDraftsQuery.isSuccess && myDrafts.length > 0 && !startNewAnyway;

  const hasCreatedDraft = useRef(false);
  const createDraftMutation = useMutation({
    mutationFn: () => api.post<Post>("/blog/posts/draft", {}),
    onSuccess: (draft) => {
      router.replace(`/write?id=${draft.id}`);
    },
  });

  useEffect(() => {
    if (id || isSessionPending || !session || hasCreatedDraft.current) return;
    if (!myDraftsQuery.isSuccess) return; // draft 유무를 알기 전엔 만들지 않음
    if (shouldPickDraft) return; // 모달에서 고를 때까지 대기
    hasCreatedDraft.current = true;
    createDraftMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isSessionPending, session, myDraftsQuery.isSuccess, shouldPickDraft]);

  const postQuery = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<Post>(`/blog/posts/${id}`),
    enabled: Boolean(id) && Boolean(session),
    retry: false,
    // 수정 화면은 열 때 한 번만 서버 값을 가져와 폼 상태로 쓰고, 캐시로 재사용하지 않는다.
    // 60초 기본 캐시를 쓰면 저장 직후 다시 열었을 때 옛 내용이 떠서 자동저장이 새 내용을 덮어쓴다.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const post = postQuery.data;
  const isOwnPost = !post || session?.user.id === post.userId;

  useEffect(() => {
    if (isSessionPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (post && !isOwnPost) {
      router.replace(`/posts/${post.id}`);
    }
  }, [isSessionPending, session, post, isOwnPost, router]);

  const categoriesQuery = useCategories();
  const flatCategories = flattenCategoryTree(buildCategoryTree(categoriesQuery.data ?? []));

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  // 출간 설정 화면(위에서 내려오는 오버레이)이 열려 있는지
  const [publishOpen, setPublishOpen] = useState(false);
  const [content, setContent] = useState("");
  // 사용자가 직접 고친 게 있는지 — 로드/정규화로 바뀐 값은 제외하려고 입력 핸들러에서만 켬.
  // 발행·삭제하면 꺼서 그 이동은 확인창 없이 보낸다.
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isContentEmpty = EMPTY_CONTENT.includes(content);

  // post가 로드되면 폼 상태를 채워줌 (draft 생성 직후 리다이렉트로 처음 로드되는 경우 포함)
  const loadedPostId = useRef<string | null>(null);
  // 로드로 인해 값이 채워지는 첫 변화는 자동저장 대상이 아님 (사용자가 아직 아무것도 안 고침)
  const skipNextAutosave = useRef(true);
  useEffect(() => {
    if (!post || loadedPostId.current === post.id) return;
    loadedPostId.current = post.id;
    skipNextAutosave.current = true;
    setTitle(post.title);
    setCategory(post.category || flatCategories[0]?.name || "");
    setIsPrivate(post.isPrivate);
    setPinned(post.pinned);
    setThumbnailUrl(post.thumbnailUrl ?? "");
    setContent(post.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  const buildBody = (): PostBody => ({
    title,
    category,
    content,
    isPrivate,
    pinned,
    thumbnailUrl: thumbnailUrl || null,
  });

  const [autosavedAt, setAutosavedAt] = useState<Date | null>(null);
  const autosaveMutation = useMutation({
    // publish 플래그 없이 PATCH — 임시저장(발행 상태·AI 요약은 그대로)
    mutationFn: (body: PostBody) => api.patch(`/blog/posts/${id}`, body),
    onSuccess: () => setAutosavedAt(new Date()),
  });

  // 제목/카테고리/본문이 바뀔 때마다, 타이핑이 잠시 멈추면(1.5초) 임시저장.
  // "저장" 버튼을 눌러야만 실제로 발행됨 — 이건 그 전까지 내용이 안 날아가게 하는 용도.
  useEffect(() => {
    if (!post) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    const timer = setTimeout(() => {
      autosaveMutation.mutate(buildBody());
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, category, content, isPrivate, pinned, thumbnailUrl, post]);

  const saveMutation = useMutation({
    mutationFn: (body: PostBody) => api.patch(`/blog/posts/${id}`, { ...body, publish: true }),
    onSuccess: () => {
      setIsDirty(false);
      router.push(`/posts/${id}`);
    },
    onError: () => {
      setError("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/posts/${id}`),
    onSuccess: () => {
      setIsDirty(false);
      router.push("/");
    },
    onError: () => {
      setError("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  // 나갈 때 1.5초 디바운스에 걸려 있던 마지막 수정이 유실되지 않도록 바로 임시저장
  const leaveGuard = useLeaveGuard(isDirty, () => autosaveMutation.mutate(buildBody()));

  // 처음 제출(하단 버튼·제목에서 Enter)은 출간 설정 화면을 열고, 그 화면에서 제출해야 실제로 저장한다
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!publishOpen) {
      setPublishOpen(true);
      return;
    }
    saveMutation.mutate(buildBody());
  }

  function handleDelete() {
    if (!window.confirm("정말 삭제하시겠어요? 되돌릴 수 없습니다.")) return;
    setError(null);
    deleteMutation.mutate();
  }

  if (isSessionPending || !session) return null;

  if (!id) {
    if (shouldPickDraft) {
      return (
        <DraftListModal
          drafts={myDrafts}
          onSelect={(draftId) => router.replace(`/write?id=${draftId}`)}
          onStartNew={() => setStartNewAnyway(true)}
          onClose={() => router.push("/")}
        />
      );
    }
    return null; // draft 목록 확인 중이거나 생성 중
  }

  if (postQuery.isError) {
    return <PostAccessDenied />;
  }
  if (!post || !isOwnPost) return null;

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{post.publishedAt ? "글 수정" : "글쓰기"}</h1>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setIsDirty(true);
        }}
        placeholder="제목"
        className="border-b border-zinc-200 pb-2 text-2xl font-bold outline-none"
      />

      {/* 수정하는 동안에도 저장돼 있는 이전 요약을 계속 보여줌 (저장하면 새 내용 기준으로 다시 생성) */}
      {post.aiSummary && post.aiSummary.summary.length > 0 && (
        <PostAiSummary
          summary={post.aiSummary.summary}
          hint="현재 저장된 요약이에요. 저장하면 수정한 내용으로 다시 만들어져요."
        />
      )}

      <PostEditor content={content} onChange={setContent} onUserEdit={() => setIsDirty(true)} />

      {/* 저장 실패 메시지는 출간 설정 화면 안에 보여준다 (화면이 덮고 있으므로) */}
      {error && !publishOpen && <p className="text-sm text-red-500">{error}</p>}

      {/* 에디터가 길어져도 저장/삭제 버튼이 항상 화면 하단에 보이도록 고정.
          모바일에선 버튼이 위, 안내 문구가 아래로 (좁은 폭에서 겹치는 것 방지).
          sticky를 씀 — main이 스크롤 컨테이너라 데스크톱 AI 패널 폭만큼 자동으로 좁아짐
          (fixed였다면 뷰포트 전체 폭이라 옆 패널을 덮어버림) */}
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
              disabled={
                !title.trim() ||
                isContentEmpty ||
                saveMutation.isPending ||
                deleteMutation.isPending
              }
            >
              저장
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
      <PublishScreen
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        formId={FORM_ID}
        publishLabel="저장"
        isPublishing={saveMutation.isPending}
        error={error}
        title={title}
        thumbnailUrl={thumbnailUrl}
        onThumbnailChange={(url) => {
          setThumbnailUrl(url);
          setIsDirty(true);
        }}
        category={category}
        onCategoryChange={(name) => {
          setCategory(name);
          setIsDirty(true);
        }}
        categories={flatCategories}
        isPrivate={isPrivate}
        onPrivateChange={(v) => {
          setIsPrivate(v);
          setIsDirty(true);
        }}
        pinned={pinned}
        onPinnedChange={(v) => {
          setPinned(v);
          setIsDirty(true);
        }}
      />
      <LeaveConfirmDialog
        open={leaveGuard.isConfirming}
        onStay={leaveGuard.cancel}
        onLeave={leaveGuard.confirm}
      />
    </form>
  );
}
