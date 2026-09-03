import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { marked } from "marked";

// 순수 텍스트(text/plain)로만 붙여넣기 될 때(예: AI 챗 답변을 md 원문 그대로 복사)
// 마크다운 문법을 실제 블록으로 변환한다. text/html이 이미 있으면(렌더링된 곳에서 복사)
// Tiptap 기본 붙여넣기 처리가 이미 잘 동작하므로 건드리지 않는다.
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;
            if (clipboardData.getData("text/html")) return false;

            const text = clipboardData.getData("text/plain");
            if (!text) return false;

            const html = marked.parse(text, { async: false, breaks: true });
            editor.chain().focus().insertContent(html).run();
            return true;
          },
        },
      }),
    ];
  },
});
