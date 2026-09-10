"use client";

import Link from "next/link";
import { useSession } from "@/shared/lib/auth-client";

type Props = {
  postId: string;
  authorId: string | null;
};

export default function EditPostLink({ postId, authorId }: Props) {
  const { data: session } = useSession();

  if (!authorId || session?.user.id !== authorId) return null;

  return (
    <Link
      href={`/write?id=${postId}`}
      className="text-xs text-zinc-400 underline hover:text-zinc-600"
    >
      수정
    </Link>
  );
}
