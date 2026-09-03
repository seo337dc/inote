import Link from "next/link";
import { MOCK_POSTS } from "@/lib/mock-posts";

export default function MyPostsPage() {
  const myPosts = MOCK_POSTS.filter((post) => post.mine);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">나의 글</h1>
      <p className="mb-6 text-sm text-zinc-500">
        로그인한 계정으로 작성한 글만 모아봅니다. (목업 데이터 · 로그인 연동 전)
      </p>

      <ul className="divide-y divide-zinc-100">
        {myPosts.map((post) => (
          <li key={post.id} className="py-5">
            <Link href={`/posts/${post.id}`} className="group block">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
                <span className="rounded bg-zinc-100 px-2 py-0.5">{post.category}</span>
                <span>{post.createdAt}</span>
              </div>
              <h2 className="text-lg font-semibold group-hover:underline">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{post.excerpt}</p>
            </Link>
          </li>
        ))}
        {myPosts.length === 0 && (
          <li className="py-10 text-center text-sm text-zinc-400">
            아직 작성한 글이 없습니다.
          </li>
        )}
      </ul>
    </div>
  );
}
