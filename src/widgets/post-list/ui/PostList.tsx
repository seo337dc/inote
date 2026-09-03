import Link from "next/link";
import type { Post } from "@/entities/post";

type Props = {
  posts: Post[];
  emptyMessage?: string;
};

export default function PostList({ posts, emptyMessage = "글이 없습니다." }: Props) {
  return (
    <ul className="divide-y divide-zinc-100">
      {posts.map((post) => (
        <li key={post.id} className="py-5">
          <Link href={`/posts/${post.id}`} className="group block">
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
              <span className="rounded bg-zinc-100 px-2 py-0.5">{post.category}</span>
              <span>{post.author}</span>
              <span>·</span>
              <span>{post.createdAt}</span>
            </div>
            <h2 className="text-lg font-semibold group-hover:underline">{post.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{post.excerpt}</p>
          </Link>
        </li>
      ))}
      {posts.length === 0 && (
        <li className="py-10 text-center text-sm text-zinc-400">{emptyMessage}</li>
      )}
    </ul>
  );
}
