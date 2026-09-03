import Link from "next/link";
import { CATEGORIES, MOCK_POSTS } from "@/lib/mock-posts";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  const posts = category
    ? MOCK_POSTS.filter((post) => post.category === category)
    : MOCK_POSTS;

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-6 py-10">
      <aside className="w-40 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          카테고리
        </p>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href="/"
              className={`block rounded px-2 py-1 ${
                !category ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              전체 ({MOCK_POSTS.length})
            </Link>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c}>
              <Link
                href={`/?category=${encodeURIComponent(c)}`}
                className={`block rounded px-2 py-1 ${
                  category === c
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {c} ({MOCK_POSTS.filter((post) => post.category === c).length})
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1">
        <h1 className="mb-1 text-2xl font-bold">모든 글</h1>
        <p className="mb-6 text-sm text-zinc-500">
          로그인 없이 누구나 볼 수 있는 공개 피드입니다. (목업 데이터)
        </p>

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
                <h2 className="text-lg font-semibold group-hover:underline">
                  {post.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{post.excerpt}</p>
              </Link>
            </li>
          ))}
          {posts.length === 0 && (
            <li className="py-10 text-center text-sm text-zinc-400">
              이 카테고리엔 아직 글이 없습니다.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
