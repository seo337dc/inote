import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { api } from "@/shared/lib/api";
import type { Post } from "@/entities/post";

type Props = {
  drafts: Post[];
  onSelect: (id: string) => void;
  onStartNew: () => void;
  onClose: () => void;
};

function previewText(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || "내용 없음";
}

export default function DraftListModal({ drafts, onSelect, onStartNew, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/blog/posts/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-drafts"] });
      setConfirmId(null);
    },
  });

  const confirmTarget = drafts.find((d) => d.id === confirmId) ?? null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open) return;
        if (confirmTarget) {
          setConfirmId(null);
          return;
        }
        onClose();
      }}
    >
      <DialogContent>
        {confirmTarget ? (
          <>
            <DialogTitle>이 draft를 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              {confirmTarget.title.trim() || "제목 없음"} — 삭제하면 되돌릴 수 없습니다.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
                취소
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmTarget.id)}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>지금 작성 중인 글이 있습니다</DialogTitle>
            <DialogDescription>이어서 쓰거나, 새 글을 시작할 수 있어요.</DialogDescription>

            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {drafts.map((draft) => (
                <li key={draft.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(draft.id)}
                    className="w-full rounded-lg border border-zinc-200 p-3 pr-10 text-left hover:bg-zinc-50"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="font-medium text-zinc-900">
                        {draft.title.trim() || "제목 없음"}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {new Date(draft.updatedAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <div className="mb-1 text-xs text-zinc-400">
                      {draft.category || "카테고리 없음"}
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-500">
                      {previewText(draft.content)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(draft.id)}
                    aria-label="draft 삭제"
                    className="absolute right-3 bottom-3 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>

            <Button type="button" variant="outline" size="lg" onClick={onStartNew}>
              새로 작성하기
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
