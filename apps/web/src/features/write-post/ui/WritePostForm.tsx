"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/entities/category";
import { PostEditor } from "@/shared/ui/editor";
import { api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import type { Post } from "@/entities/post";
import { useMyDrafts } from "@/entities/post";
import PostAccessDenied from "./PostAccessDenied";
import DraftListModal from "./DraftListModal";

const EMPTY_CONTENT = ["", "<p></p>"];

type Props = {
  id: string | null;
};

type PostBody = {
  title: string;
  category: (typeof CATEGORIES)[number];
  content: string;
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

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const [content, setContent] = useState("");
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
    setCategory((post.category as (typeof CATEGORIES)[number]) || CATEGORIES[0]);
    setContent(post.content);
  }, [post]);

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
      autosaveMutation.mutate({ title, category, content });
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, category, content, post]);

  const saveMutation = useMutation({
    mutationFn: (body: PostBody) => api.patch(`/blog/posts/${id}`, { ...body, publish: true }),
    onSuccess: () => {
      router.push(`/posts/${id}`);
    },
    onError: () => {
      setError("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/posts/${id}`),
    onSuccess: () => {
      router.push("/");
    },
    onError: () => {
      setError("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate({ title, category, content });
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{post.publishedAt ? "글 수정" : "글쓰기"}</h1>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        className="border-b border-zinc-200 pb-2 text-2xl font-bold outline-none"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
        className="w-32 rounded border border-zinc-300 px-2 py-1 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <PostEditor content={content} onChange={setContent} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 에디터가 길어져도 저장/삭제 버튼이 항상 화면 하단에 보이도록 고정.
          모바일에선 버튼이 위, 안내 문구가 아래로 (좁은 폭에서 겹치는 것 방지).
          sticky를 씀 — main이 스크롤 컨테이너라 데스크톱 AI 패널 폭만큼 자동으로 좁아짐
          (fixed였다면 뷰포트 전체 폭이라 옆 패널을 덮어버림) */}
      <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-end gap-2 sm:order-2">
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
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </button>
          </div>
          <p className="text-xs text-zinc-400 sm:order-1">
            {autosaveMutation.isPending
              ? "임시 저장 중..."
              : autosavedAt
                ? `임시 저장됨 · ${autosavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                : "LLM 챗으로 초안 작성 기능은 Phase 2(inote-ai 연동)에서 추가 예정"}
          </p>
        </div>
      </div>
    </form>
  );
}
