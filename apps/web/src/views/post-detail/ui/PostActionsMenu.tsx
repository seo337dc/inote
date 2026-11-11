"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Ellipsis, Star, Trash2, Undo2 } from "lucide-react";
import { useArchivePosts, useUnpublishPost, type Post } from "@/entities/post";
import { ApiError, api } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

// 임시저장으로 바꾼 뒤 이동할 곳 — 임시저장 목록 화면(/my-posts/drafts)
const DRAFTS_PATH = "/my-posts/drafts";
const GENERIC_ERROR = "처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

type Props = { post: Pick<Post, "id" | "userId" | "pinned" | "archivedAt" | "publishedAt"> };

/**
 * 글 상세 상단의 작성자 메뉴(⋯) — 고정·보관·임시저장으로 변경·삭제를 한 목록으로 모은다(수정은 밖의 링크).
 * 작성자 본인에게만 보인다. 확인이 필요한 동작(임시저장으로 변경·삭제)의 확인창은 메뉴가 닫혀도 남도록 메뉴 밖에서 관리한다.
 * 임시저장(발행 전) 글에는 고정·보관·임시저장으로 변경이 의미가 없어 삭제만 보인다.
 */
export default function PostActionsMenu({ post }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pinned, setPinned] = useState(post.pinned);
  const [archived, setArchived] = useState(Boolean(post.archivedAt));
  const [dialog, setDialog] = useState<"unpublish" | "delete" | null>(null);

  const pinMutation = useMutation({
    mutationFn: (next: boolean) => api.patch(`/blog/posts/${post.id}`, { pinned: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      router.refresh();
    },
    onError: (_err, next) => setPinned(!next),
  });
  const archiveMutation = useArchivePosts();
  const unpublishMutation = useUnpublishPost();
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/posts/${post.id}`),
    onSuccess: () => router.push("/"),
  });

  if (!post.userId || session?.user.id !== post.userId) return null;
  const isDraft = !post.publishedAt;

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    pinMutation.mutate(next);
  }

  function toggleArchive() {
    const next = !archived;
    archiveMutation.mutate(
      { ids: [post.id], archived: next },
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
        onError: () => toast.error(GENERIC_ERROR),
      },
    );
  }

  function unpublish() {
    unpublishMutation.mutate(post.id, {
      onSuccess: () => {
        setDialog(null);
        toast.success("임시저장으로 바꿨어요.");
        router.push(DRAFTS_PATH);
      },
      onError: (error) => {
        setDialog(null);
        toast.error(
          error instanceof ApiError && error.status === 409
            ? "보관을 해제한 뒤 임시저장으로 바꿀 수 있어요."
            : GENERIC_ERROR,
        );
      },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="글 관리 메뉴"
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <Ellipsis className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!isDraft && (
            <>
              <DropdownMenuItem onClick={togglePin} className="gap-2">
                <Star className={`size-4 ${pinned ? "fill-amber-400 text-amber-400" : ""}`} />
                {pinned ? "고정 해제" : "고정"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleArchive} className="gap-2">
                {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {archived ? "보관 해제" : "보관"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={archived} onClick={() => setDialog("unpublish")} className="gap-2">
                <Undo2 className="size-4" />
                임시저장으로 변경
                {archived && <span className="ml-auto pl-3 text-xs text-zinc-400">보관 해제 후 가능</span>}
              </DropdownMenuItem>
              <div role="separator" className="my-1 h-px bg-zinc-100" />
            </>
          )}
          <DropdownMenuItem onClick={() => setDialog("delete")} className="gap-2 text-red-500 data-highlighted:bg-red-50 data-highlighted:text-red-600">
            <Trash2 className="size-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === "unpublish" && (
        <Dialog open onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogTitle>이 글을 임시저장으로 바꾸시겠습니까?</DialogTitle>
            <DialogDescription>
              다른 사람에게 보이지 않고, 임시저장 목록에서 이어서 쓸 수 있어요. 다시 발행하면 발행일은 그때로 바뀝니다.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                취소
              </Button>
              <Button type="button" disabled={unpublishMutation.isPending} onClick={unpublish}>
                {unpublishMutation.isPending ? "변경 중..." : "임시저장으로 변경"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {dialog === "delete" && (
        <Dialog open onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogTitle>이 글을 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>삭제하면 되돌릴 수 없습니다.</DialogDescription>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                취소
              </Button>
              <Button type="button" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </Button>
            </div>
            {deleteMutation.isError && <p className="text-xs text-red-500">삭제에 실패했습니다. 잠시 후 다시 시도해주세요.</p>}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
