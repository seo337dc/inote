"use client";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";

type Props = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export function LeaveConfirmDialog({ open, onStay, onLeave }: Props) {
  if (!open) return null;

  return (
    <Dialog open onOpenChange={(next) => !next && onStay()}>
      <DialogContent>
        <DialogTitle>작성 중인 글이 있어요</DialogTitle>
        <DialogDescription>
          지금 페이지를 나가면 작성 중인 내용은 임시 저장 상태로 남아요. 나가시겠어요?
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onStay}>
            계속 작성
          </Button>
          <Button type="button" onClick={onLeave}>
            나가기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
