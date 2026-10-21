import type { Editor } from "@tiptap/core";
import { validateImageFile, type UploadImage } from "./image-upload";

export type ImageInsertDeps = {
  upload: UploadImage;
  // 사용자에게 보여줄 오류 문구 (토스트 등)
  onError: (message: string) => void;
};

const UPLOAD_FAILED = "이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.";
const ONE_AT_A_TIME = "이미지는 한 장씩 올릴 수 있어요. 첫 번째 이미지만 올렸어요.";

let uploadSeq = 0;

// 올리는 동안 보여줄 미리보기 주소. 테스트·옛 환경처럼 만들 수 없으면 빈 문자열.
function createPreviewUrl(file: File): string {
  return typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
}

function findImageByUploadId(editor: Editor, uploadId: string): { pos: number; attrs: Record<string, unknown> } | null {
  let found: { pos: number; attrs: Record<string, unknown> } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (!found && node.type.name === "image" && node.attrs.uploadId === uploadId) {
      found = { pos, attrs: node.attrs };
    }
    return found === null;
  });
  return found;
}

// 이미지를 커서(또는 pos) 위치에 바로 넣고 뒤에서 올린다.
// 1) 올리는 중 노드를 먼저 넣는다 (미리보기, uploadId 표시 — 이 상태는 저장되는 HTML에 나가지 않는다)
// 2) 성공하면 같은 노드의 src를 tmp 주소로 바꾼다 (이 교체는 실행 취소 기록에 남기지 않는다)
// 3) 실패하면 그 노드를 지우고 안내한다. 올리기 전에 형식·크기가 맞지 않으면 노드도 요청도 만들지 않는다.
// 한 번에 한 장만 올린다 (여러 장 동시 업로드는 후속 — docs/후속/editor-image-upload.md).
export function insertImageFiles(editor: Editor, files: File[], deps: ImageInsertDeps, pos?: number): void {
  const [file] = files;
  if (!file) return;
  if (files.length > 1) deps.onError(ONE_AT_A_TIME);

  const invalid = validateImageFile(file);
  if (invalid) {
    deps.onError(invalid);
    return;
  }

  uploadSeq += 1;
  const uploadId = `image-upload-${uploadSeq}`;
  const preview = createPreviewUrl(file);
  const at = Math.min(pos ?? editor.state.selection.to, editor.state.doc.content.size);

  editor
    .chain()
    .focus()
    .insertContentAt(at, { type: "image", attrs: { src: preview, uploadId } })
    .run();

  // 이미지가 글의 맨 끝이면 그 뒤에서 이어 쓸 수 있게 빈 문단을 하나 둔다
  const last = editor.state.doc.lastChild;
  if (last?.type.name === "image") {
    editor.chain().insertContentAt(editor.state.doc.content.size, { type: "paragraph" }).run();
  }

  const finish = () => {
    if (preview) URL.revokeObjectURL(preview);
  };

  deps
    .upload(file)
    .then(({ url }) => {
      if (editor.isDestroyed) return;
      const target = findImageByUploadId(editor, uploadId);
      if (!target) return; // 올리는 동안 사용자가 이미지를 지웠다
      const tr = editor.state.tr.setNodeMarkup(target.pos, undefined, { ...target.attrs, src: url, uploadId: null });
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    })
    .catch(() => {
      deps.onError(UPLOAD_FAILED);
      if (editor.isDestroyed) return;
      const target = findImageByUploadId(editor, uploadId);
      if (!target) return;
      const tr = editor.state.tr.delete(target.pos, target.pos + 1);
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    })
    .finally(finish);
}
