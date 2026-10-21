import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { insertImageFiles, type ImageInsertDeps } from "./image-commands";
import { IMAGE_ACCEPT, pickImageFiles, uploadPostImage } from "./image-upload";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageUpload: {
      // 파일 선택창을 열어 고른 이미지를 커서 위치에 넣는다 (슬래시 메뉴·툴바 공통)
      pickImage: () => ReturnType;
    };
  }
}

type Options = ImageInsertDeps;

// 보이지 않는 파일 입력을 만들어 선택창을 연다. 취소해도 정리할 것이 없도록 문서에는 붙이지 않는다.
function openImageFilePicker(onPicked: (files: File[]) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = IMAGE_ACCEPT;
  input.addEventListener("change", () => onPicked(pickImageFiles(input.files)));
  input.click();
}

// 에디터에 이미지를 넣는 길: 클립보드 붙여넣기, 파일 끌어다 놓기, 선택창(pickImage). 모두 커서(놓은) 위치에 넣는다.
export const ImageUpload = Extension.create<Options>({
  name: "imageUpload",
  // 마크다운 붙여넣기(MarkdownPaste)보다 먼저 파일 붙여넣기를 처리해야 한다
  priority: 1000,

  addOptions() {
    return { upload: uploadPostImage, onError: () => {} };
  },

  addCommands() {
    return {
      pickImage:
        () =>
        () => {
          openImageFilePicker((files) => insertImageFiles(this.editor, files, this.options));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const files = pickImageFiles(event.clipboardData?.files);
            if (files.length === 0) return false;
            insertImageFiles(editor, files, options);
            return true;
          },
          handleDrop(view, event) {
            // 에디터 안에서 노드를 끌어 옮기는 동작은 files가 비어 있어 여기서 걸리지 않는다
            const files = pickImageFiles(event.dataTransfer?.files);
            if (files.length === 0) return false;
            event.preventDefault();
            const dropAt = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
            insertImageFiles(editor, files, options, dropAt);
            return true;
          },
        },
      }),
    ];
  },
});
