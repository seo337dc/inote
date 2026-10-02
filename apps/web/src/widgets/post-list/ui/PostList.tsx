import Link from "next/link";
import { Star } from "lucide-react";
import { PostDates, PrivateBadge, type Post } from "@/entities/post";

type Props = {
  posts: Post[];
  emptyMessage?: string;
  // 고정 글 섹션처럼 이미 "고정 글" 제목으로 묶여 있으면 행마다 별을 또 달 필요가 없음
  showPinIcon?: boolean;
};

export default function PostList({
  posts,
  emptyMessage = "글이 없습니다.",
  showPinIcon = true,
}: Props) {
  return (
    <ul className="divide-y divide-zinc-100">
      {posts.map((post) => (
        <li key={post.id} className="py-5">
          <Link href={`/posts/${post.id}`} className="group flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2 overflow-hidden">
                  {showPinIcon && post.pinned && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
                  <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5">{post.category}</span>
                  {post.isPrivate && <PrivateBadge />}
                  <span className="truncate">
                    {post.user ? `${post.user.name} (${post.user.email})` : "작성자 없음"}
                  </span>
                </div>
                <span className="shrink-0">
                  <PostDates post={post} />
                </span>
              </div>
              <h2 className="text-lg font-semibold group-hover:underline">{post.title}</h2>
              {post.excerpt && <p className="mt-1 text-sm text-zinc-500">{post.excerpt}</p>}
            </div>
            {post.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-20 w-32 shrink-0 rounded object-cover"
              />
            )}
          </Link>
        </li>
      ))}
      {posts.length === 0 && (
        <li className="py-10 text-center text-sm text-zinc-400">{emptyMessage}</li>
      )}
    </ul>
  );
}
