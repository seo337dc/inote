"use client";

import Link from "next/link";
import { useSession } from "@/shared/lib/auth-client";

type Props = {
  readingLogId: string;
  authorId: string;
};

export default function EditReadingLogLink({ readingLogId, authorId }: Props) {
  const { data: session } = useSession();

  if (session?.user.id !== authorId) return null;

  return (
    <Link
      href={`/reading/write?id=${readingLogId}`}
      className="text-xs text-zinc-400 underline hover:text-zinc-600"
    >
      수정
    </Link>
  );
}
