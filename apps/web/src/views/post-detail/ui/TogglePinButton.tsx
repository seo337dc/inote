"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";

type Props = {
  postId: string;
  authorId: string | null;
  initialPinned: boolean;
};

export default function TogglePinButton({ postId, authorId, initialPinned }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pinned, setPinned] = useState(initialPinned);

  const mutation = useMutation({
    mutationFn: (next: boolean) => api.patch(`/blog/posts/${postId}`, { pinned: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      router.refresh();
    },
    onError: (_err, next) => setPinned(!next),
  });

  if (!authorId || session?.user.id !== authorId) return null;

  function handleToggle() {
    const next = !pinned;
    setPinned(next);
    mutation.mutate(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={mutation.isPending}
      aria-label={pinned ? "고정 해제" : "목록 상단에 고정"}
      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
    >
      <Star className={`size-3.5 ${pinned ? "fill-amber-400 text-amber-400" : ""}`} />
      고정
    </button>
  );
}
