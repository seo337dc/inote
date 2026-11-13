import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { TOOLBAR_SHORTCUTS } from "./toolbar-shortcuts";
import { buildMoreItems } from "./toolbar-items";

let editor: Editor;
afterEach(() => editor?.destroy());

// 툴바 버튼의 말풍선이 보여주는 단축키는 실제 에디터 확장이 등록한 키여야 한다
function registeredKeys(extensionName: string): string[] {
  const ext = editor.extensionManager.extensions.find((e) => e.name === extensionName);
  if (!ext) throw new Error(`확장을 찾을 수 없음: ${extensionName}`);
  const add = (ext.config as { addKeyboardShortcuts?: () => Record<string, unknown> }).addKeyboardShortcuts;
  if (!add) return [];
  const context = {
    name: ext.name,
    options: ext.options,
    storage: ext.storage,
    editor,
    type: editor.schema.nodes[ext.name] ?? editor.schema.marks[ext.name],
    parent: undefined,
  };
  return Object.keys(add.call(context));
}

describe("툴바 단축키 표시는 실제 확장의 단축키와 같다", () => {
  it.each(Object.entries(TOOLBAR_SHORTCUTS))("%s: %s", (_name, { key, extension }) => {
    editor = new Editor({
      extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
      content: "<p>x</p>",
    });
    // Tiptap은 같은 키를 대소문자 두 가지로 등록하기도 한다(Mod-b / Mod-B)
    const keys = registeredKeys(extension).map((k) => k.toLowerCase());
    expect(keys).toContain(key.toLowerCase());
  });
});

describe("툴바 항목의 단축키", () => {
  const noState = {
    active: { bulletList: false, taskList: false, blockquote: false, link: false, code: false, codeBlock: false },
    inTable: false,
    inCallout: false,
    openLinkPopup: vi.fn(),
  };
  const items = () => buildMoreItems({} as TiptapEditor, noState);

  it("목록·체크박스·인용·인라인 코드·코드 블록은 TOOLBAR_SHORTCUTS의 키를 쓴다", () => {
    const byKey = Object.fromEntries(items().map((i) => [i.key, i.shortcut]));
    expect(byKey).toMatchObject({
      bulletList: TOOLBAR_SHORTCUTS.bulletList.key,
      taskList: TOOLBAR_SHORTCUTS.taskList.key,
      blockquote: TOOLBAR_SHORTCUTS.blockquote.key,
      code: TOOLBAR_SHORTCUTS.code.key,
      codeBlock: TOOLBAR_SHORTCUTS.codeBlock.key,
    });
  });

  it("단축키가 없는 링크·표·콜아웃·이미지에는 단축키 표시가 없다", () => {
    const byKey = Object.fromEntries(items().map((i) => [i.key, i.shortcut]));
    for (const key of ["link", "table", "callout", "image"]) expect(byKey[key]).toBeUndefined();
  });
});
