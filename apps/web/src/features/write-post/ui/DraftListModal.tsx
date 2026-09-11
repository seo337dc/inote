import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
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
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>지금 작성 중인 글이 있습니다</DialogTitle>
        <DialogDescription>이어서 쓰거나, 새 글을 시작할 수 있어요.</DialogDescription>

        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                onClick={() => onSelect(draft.id)}
                className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-50"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="font-medium text-zinc-900">
                    {draft.title.trim() || "제목 없음"}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(draft.updatedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="mb-1 text-xs text-zinc-400">{draft.category || "카테고리 없음"}</div>
                <p className="line-clamp-2 text-sm text-zinc-500">{previewText(draft.content)}</p>
              </button>
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" size="lg" onClick={onStartNew}>
          새로 작성하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
