import type { Post } from "@/entities/post";
import DeletePostButton from "./DeletePostButton";
import EditPostLink from "./EditPostLink";
import PostAiSummary from "./PostAiSummary";
import TogglePinButton from "./TogglePinButton";

// 서버(공개 글 SSR)와 클라이언트(작성자 본인 확인 후 폴백) 양쪽에서 같은 화면을 그리려고 분리.
export default function PostArticle({ post }: { post: Post }) {
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
