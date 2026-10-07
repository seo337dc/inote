import { PostDates, PrivateBadge, type Post } from "@/entities/post";
import { buildToc } from "@/shared/lib/toc";
import CategoryBreadcrumb from "./CategoryBreadcrumb";
import DeletePostButton from "./DeletePostButton";
import EditPostLink from "./EditPostLink";
import PostArticleLayout, {
  OUTLINE_HEADER_CLASS,
  OutlinePanel,
  TOC_HEADER_CLASS,
  TocPanel,
} from "./PostArticleLayout";
import PostSummarySection from "./PostSummarySection";
import TogglePinButton from "./TogglePinButton";

// 서버(공개 글 SSR)와 클라이언트(작성자 본인 확인 후 폴백) 양쪽에서 같은 화면을 그리려고 분리.
export default function PostArticle({ post }: { post: Post }) {
  // 3열 배치: 왼쪽 카테고리 트리 / 본문 / 오른쪽 목차(h1~h3). 폭이 부족하면 목차 → 카테고리 순으로 숨기고,
  // 넓은 화면에서는 두 영역을 직접 접어 본문을 넓힐 수 있다 (PostArticleLayout).
  const { html, items } = buildToc(post.content);

  return (
    <PostArticleLayout
      outline={<OutlinePanel currentPostId={post.id} headerClassName={OUTLINE_HEADER_CLASS} />}
      toc={items.length > 0 ? <TocPanel items={items} headerClassName={TOC_HEADER_CLASS} /> : null}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryBreadcrumb post={post} />
          {post.isPrivate && <PrivateBadge />}
        </div>
        <div className="flex items-center gap-3">
          <TogglePinButton postId={post.id} authorId={post.userId} initialPinned={post.pinned} />
          <EditPostLink postId={post.id} authorId={post.userId} />
          <DeletePostButton postId={post.id} authorId={post.userId} />
        </div>
      </div>
      <h1 className="mb-3 text-3xl font-bold">{post.title}</h1>
      <div className="mb-6 flex items-start justify-between gap-4 text-sm text-zinc-400">
        <p className="min-w-0 truncate">
          {post.user ? `${post.user.name} (${post.user.email})` : "작성자 없음"}
        </p>
        <p className="shrink-0 text-right">
          <PostDates post={post} />
        </p>
      </div>
      {post.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시
        <img
          src={post.thumbnailUrl}
          alt=""
          className="mb-6 max-h-96 w-full rounded-2xl border border-zinc-200 object-cover"
        />
      )}
      <PostSummarySection
        postId={post.id}
        authorId={post.userId}
        initialSummary={post.aiSummary?.summary ?? []}
      />
      {/* 본인만 쓰는 개인 블로그라 별도 sanitize 없이 그대로 렌더 (docs/FSD.md 신뢰 경계와 동일 맥락) */}
      <div
        className="prose prose-zinc prose-compact min-h-[90vh] max-w-none break-words rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PostArticleLayout>
  );
}
