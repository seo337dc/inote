import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { marked } from "marked";

// text/html에 진짜 의미있는 블록 구조(제목/목록/표/코드블록 태그)가 없으면
// (예: 코드 뷰어가 줄마다 <div style="color:...">로 문법 강조만 흉내 낸 경우 — <pre>/<code> 없음)
// 그 html은 신뢰하지 않고, text/plain을 marked로 직접 마크다운 변환한다.
// 이미 잘 만들어진 마크업(진짜 마크다운 렌더러에서 복사한 경우)은 그대로 Tiptap 기본 처리에 맡긴다.
const STRUCTURAL_HTML_TAG = /<(h[1-6]|ul|ol|li|table|pre|code|blockquote)[\s>]/i;

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

            const html = clipboardData.getData("text/html");
            if (html && STRUCTURAL_HTML_TAG.test(html)) return false;

            const text = clipboardData.getData("text/plain");
            if (!text) return false;

            const parsedHtml = marked.parse(text, { async: false, breaks: true });
            editor.chain().focus().insertContent(parsedHtml).run();
            return true;
          },
        },
      }),
    ];
  },
});
