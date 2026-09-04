import Link from "next/link";
import { notFound } from "next/navigation";
import type { Post } from "@/entities/post";
import { api, ApiError } from "@/shared/lib/api";

type Props = {
  id: string;
};

export default async function PostDetailPage({ id }: Props) {
  let post: Post;
  try {
    post = await api.get<Post>(`/blog/posts/${id}`, { cache: "no-store" });
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
        <Link
          href={`/write?id=${post.id}`}
          className="text-xs text-zinc-400 underline hover:text-zinc-600"
        >
          수정
        </Link>
      </div>
      <h1 className="mb-3 text-3xl font-bold">{post.title}</h1>
      <p className="mb-10 text-sm text-zinc-400">
        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
      </p>
      {/* 본인만 쓰는 개인 블로그라 별도 sanitize 없이 그대로 렌더 (docs/FSD.md 신뢰 경계와 동일 맥락) */}
      <div
        className="prose prose-zinc max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
