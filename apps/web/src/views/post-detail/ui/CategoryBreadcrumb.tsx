import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Post } from "@/entities/post";

// 글 제목 위의 카테고리 경로 — "학습 > AI"처럼 위치를 보여주고, 각 이름을 누르면 그 카테고리의 글 목록으로 간다.
// 공개 글을 서버에서 그리는 PostArticle 안에서 쓰이므로 상태·훅 없이 링크만으로 만든다.
// 경로를 못 받았으면(목록 응답, 아직 경로를 안 보내는 BE) 카테고리 이름 하나만 같은 모양으로 보여준다.
export default function CategoryBreadcrumb({ post }: { post: Pick<Post, "category" | "categoryPath"> }) {
  const path = post.categoryPath?.length ? post.categoryPath : post.category ? [post.category] : [];
  if (path.length === 0) return null;

  return (
    <nav
      aria-label="카테고리 경로"
      className="flex items-center gap-0.5 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400"
    >
      {path.map((name, index) => (
        // 이름은 중복될 수 있어(다른 부모 아래 같은 이름) 위치까지 붙여 key를 만든다
        <span key={`${index}:${name}`} className="flex items-center gap-0.5">
          {index > 0 && <ChevronRight className="size-3" aria-hidden />}
          <Link href={`/?category=${encodeURIComponent(name)}`} className="hover:text-zinc-700 hover:underline">
            {name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
