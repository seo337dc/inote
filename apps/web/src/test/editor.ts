import { act } from "@testing-library/react";
import type { Editor } from "@tiptap/react";

/**
 * 에디터 테스트용: Tiptap이 `.ProseMirror` DOM 요소에 달아 둔 `editor`로 문서 내부를 직접 읽고 조작한다.
 * 파일마다 쓰는 API 부분집합을 따로 타입으로 만들던 것을 실제 `Editor` 타입 하나로 대신한다.
 */
export type EditorElement = HTMLElement & { editor: Editor };

/** 문서에서 `text`가 있는 글자 노드를 찾아 그 글자만 범위 선택한다 (첫 번째 일치). */
export function selectText(el: EditorElement, text: string) {
  let start = -1;
  el.editor.state.doc.descendants((node, pos) => {
    const i = node.isText ? (node.text?.indexOf(text) ?? -1) : -1;
    if (start < 0 && i >= 0) start = pos + i;
  });
  act(() => {
    el.editor.commands.setTextSelection({ from: start, to: start + text.length });
  });
}

/** 글자 내용이 `text`와 정확히 같은 글자 노드의 첫 글자 뒤에 커서를 놓고 에디터에 포커스한다. */
export function placeCursorIn(el: EditorElement, text: string) {
  let found = -1;
  el.editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text === text) found = pos + 1;
  });
  act(() => {
    el.editor.commands.setTextSelection(found);
    el.editor.commands.focus();
  });
}
