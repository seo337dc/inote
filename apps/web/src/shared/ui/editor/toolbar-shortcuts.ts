/**
 * 툴바 버튼에 단축키 툴팁으로 보여주는 단축키. 모두 Tiptap 확장의 기본값이다(이 앱이 따로 정의한 단축키는 없다).
 * 툴팁은 "그 단축키를 누르면 버튼과 같은 일이 일어난다"는 약속이므로, 아래 key가 실제 확장에 등록돼 있는지를
 * toolbar-shortcuts.test.ts가 확인한다 (Tiptap을 올렸을 때 기본값이 바뀌면 거기서 잡힌다).
 *
 * 일부러 넣지 않은 것:
 * - H1~H4: 단축키(Mod-Alt-1~4)는 Tiptap 기본 동작이고, 버튼은 줄바꿈으로 이어진 문단에서 누른 줄만 제목으로 바꾸는
 *   toggleHeadingOnLine을 써서 둘의 동작이 다르다. 맞추기 전에는 보여주지 않는다.
 * - 링크·표·콜아웃·이미지: 단축키가 없다.
 */
export const TOOLBAR_SHORTCUTS = {
  bold: { key: "Mod-b", extension: "bold" },
  italic: { key: "Mod-i", extension: "italic" },
  strike: { key: "Mod-Shift-s", extension: "strike" },
  bulletList: { key: "Mod-Shift-8", extension: "bulletList" },
  taskList: { key: "Mod-Shift-9", extension: "taskList" },
  blockquote: { key: "Mod-Shift-b", extension: "blockquote" },
  code: { key: "Mod-e", extension: "code" },
  codeBlock: { key: "Mod-Alt-c", extension: "codeBlock" },
} as const;
