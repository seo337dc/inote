"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategoryPath, type Post } from "@/entities/post";
import { useSession } from "@/shared/lib/auth-client";

// 글 제목 위의 카테고리 경로 — "학습 > AI"처럼 위치를 보여준다.
// 카테고리별 목록은 "나의 글"에만 있어서, 작성자 본인이 볼 때만 각 이름이 그 카테고리의 나의 글 목록으로 가는 링크가 되고
// 다른 사람이 보거나 로그인 전이면 글자로만 보여준다. 경로를 못 받았으면 카테고리 이름 하나만 같은 모양으로 보여준다.
export default function CategoryBreadcrumb({ post }: { post: Pick<Post, "category" | "categoryPath" | "userId"> }) {
  const { data: session } = useSession();
  const path = getCategoryPath(post);
  if (path.length === 0) return null;

  const isAuthor = !!post.userId && session?.user.id === post.userId;

  return (
    <nav
      aria-label="카테고리 경로"
      className="flex items-center gap-0.5 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400"
    >
      {path.map((name, index) => (
        // 이름은 중복될 수 있어(다른 부모 아래 같은 이름) 위치까지 붙여 key를 만든다
        <span key={`${index}:${name}`} className="flex items-center gap-0.5">
          {index > 0 && <ChevronRight className="size-3" aria-hidden />}
          {isAuthor ? (
            <Link href={`/my-posts?category=${encodeURIComponent(name)}`} className="hover:text-zinc-700 hover:underline">
              {name}
            </Link>
          ) : (
            <span>{name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
