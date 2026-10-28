"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore } from "lucide-react";
import { useSession } from "@/shared/lib/auth-client";
import { useArchivePosts } from "@/entities/post";

type Props = {
  postId: string;
  authorId: string | null;
  initialArchived: boolean;
};

// 글 상세(작성자만 보임)의 보관하기 / 보관 해제 버튼. 글 목록의 일괄 처리와 같은 API(ids 한 개)를 쓴다.
export default function ArchivePostButton({ postId, authorId, initialArchived }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const mutation = useArchivePosts();
  const [archived, setArchived] = useState(initialArchived);

  if (!authorId || session?.user.id !== authorId) return null;

  function handleToggle() {
    const next = !archived;
    mutation.mutate(
      { ids: [postId], archived: next },
      {
        onSuccess: (doneIds) => {
          if (doneIds.length === 0) {
            toast.error(next ? "보관하지 못했어요. 발행된 글만 보관할 수 있어요." : "보관 해제하지 못했어요.");
            return;
          }
          setArchived(next);
          toast.success(next ? "보관함으로 옮겼어요." : "보관을 해제했어요.");
          router.refresh();
        },
        onError: () => toast.error("처리하지 못했어요. 잠시 후 다시 시도해 주세요."),
      },
    );
  }

  const Icon = archived ? ArchiveRestore : Archive;
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={mutation.isPending}
      aria-label={archived ? "보관 해제" : "보관함으로 옮기기"}
      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
    >
      <Icon className="size-3.5" />
      {archived ? "보관 해제" : "보관"}
    </button>
  );
}
