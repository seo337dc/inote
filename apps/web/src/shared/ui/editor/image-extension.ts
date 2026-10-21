import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageView from "./ImageView";
import { parseWidthPercent } from "./image-resize";

// 글 이미지 노드 — 기본 이미지에 "본문 폭 대비 너비(%)"와 크기 조절 핸들을 더한다.
// 저장 형태: <img src="…" style="width: 60%"> (읽기 화면은 이 HTML을 그대로 그려서 별도 처리가 필요 없다)
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => parseWidthPercent(element.getAttribute("style")),
        renderHTML: (attributes: Record<string, unknown>) => (attributes.width ? { style: `width: ${attributes.width}%` } : {}),
      },
      // 올리는 중인 이미지의 표시 — HTML에는 나가지 않는다
      uploadId: { default: null, rendered: false },
    };
  },

  // 올리는 중인 이미지는 미리보기 주소(blob:)를 가지고 있어서 그대로 저장되면 안 된다 — 자동 임시저장이 올리는 중에 돌 수 있다.
  // 이 자리는 빈 표시만 내보내고(저장 후 다시 열면 사라진다), 업로드가 끝나 src가 바뀌면 그때부터 진짜 <img>가 나간다.
  renderHTML(props) {
    if (props.node.attrs.uploadId) return ["span", { "data-image-uploading": "" }];
    return this.parent?.(props) ?? ["img", props.HTMLAttributes];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});
