import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Post } from "@/entities/post";
import { api, ApiError } from "@/shared/lib/api";
import DeletePostButton from "./DeletePostButton";
import EditPostLink from "./EditPostLink";
import PostAiSummary from "./PostAiSummary";
import TogglePinButton from "./TogglePinButton";

type Props = {
  id: string;
};

export default async function PostDetailPage({ id }: Props) {
  // 서버 컴포넌트의 fetch는 브라우저 쿠키를 자동으로 안 실어줘서, 비공개/draft
  // 글을 작성자 본인이 볼 때도 BE엔 비로그인 요청으로 보임 — 직접 포워딩해야 함.
  const cookieHeader = (await cookies()).toString();

  let post: Post;
  try {
    post = await api.get<Post>(`/blog/posts/${id}`, {
      cache: "no-store",
      headers: { Cookie: cookieHeader },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
          {post.category}
        </span>
        <div className="flex items-center gap-3">
          <TogglePinButton postId={post.id} authorId={post.userId} initialPinned={post.pinned} />
          <EditPostLink postId={post.id} authorId={post.userId} />
          <DeletePostButton postId={post.id} authorId={post.userId} />
        </div>
      </div>
      <h1 className="mb-3 text-3xl font-bold">{post.title}</h1>
      <p className="mb-6 text-sm text-zinc-400">
        {post.user ? `${post.user.name} (${post.user.email})` : "작성자 없음"} ·{" "}
        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
      </p>
      {post.aiSummary && <PostAiSummary summary={post.aiSummary.summary} />}
      {/* 본인만 쓰는 개인 블로그라 별도 sanitize 없이 그대로 렌더 (docs/FSD.md 신뢰 경계와 동일 맥락) */}
      <div
        className="prose prose-zinc min-h-[90vh] max-w-none break-words rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
