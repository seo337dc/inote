"use client";

import Link from "next/link";
import type { Post } from "@/entities/post";
import { useSession } from "@/shared/lib/auth-client";

// 목록 카드의 작성자 — 누르면 그 사람의 공개 글 목록(/users/[id])으로 간다.
// 로그인한 사용자가 자기 글의 작성자를 누르면 공개 페이지가 아니라 "나의 글"(/my-posts)로 보낸다
// (비공개·임시저장까지 보이는 내 화면이 있어서). 작성자 정보가 없는 글(탈퇴 등)은 글자로만 보여준다.
export default function PostAuthor({ post }: { post: Pick<Post, "user" | "userId"> }) {
  const { data: session } = useSession();

  if (!post.user) return <span className="truncate">작성자 없음</span>;
  const label = `${post.user.name} (${post.user.email})`;
  if (!post.userId) return <span className="truncate">{label}</span>;

  const href = session?.user.id === post.userId ? "/my-posts" : `/users/${post.userId}`;
  return (
    <Link href={href} className="truncate hover:text-zinc-700 hover:underline">
      {label}
    </Link>
  );
}
