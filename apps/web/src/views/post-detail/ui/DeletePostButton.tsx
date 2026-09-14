"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";

type Props = {
  postId: string;
  authorId: string | null;
};

export default function DeletePostButton({ postId, authorId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/posts/${postId}`),
    onSuccess: () => router.push("/"),
  });

  if (!authorId || session?.user.id !== authorId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-red-400 underline hover:text-red-600"
      >
        삭제
      </button>

      {confirming && (
        <Dialog open onOpenChange={(open) => !open && setConfirming(false)}>
          <DialogContent>
            <DialogTitle>이 글을 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>삭제하면 되돌릴 수 없습니다.</DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
            {deleteMutation.isError && (
              <p className="text-xs text-red-500">삭제에 실패했습니다. 잠시 후 다시 시도해주세요.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
