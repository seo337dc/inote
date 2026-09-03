import { notFound } from "next/navigation";
import { MOCK_POSTS } from "@/entities/post";

type Props = {
  id: string;
};

export default function PostDetailPage({ id }: Props) {
  const post = MOCK_POSTS.find((p) => p.id === id);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <p className="mb-3 text-xs text-zinc-400">
        <span className="rounded bg-zinc-100 px-2 py-0.5">{post.category}</span>
      </p>
      <h1 className="mb-3 text-3xl font-bold">{post.title}</h1>
      <p className="mb-10 text-sm text-zinc-400">
        {post.author} · {post.createdAt}
      </p>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
        {post.excerpt}
        {"\n\n(목업 데이터 — 실제 본문은 inote-server의 blog 모듈 연동 후 표시됩니다.)"}
      </p>
    </article>
  );
}
