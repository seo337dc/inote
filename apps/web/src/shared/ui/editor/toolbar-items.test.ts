import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { buildMoreItems, type ToolbarMoreState } from "./toolbar-items";
import { DEFAULT_TABLE } from "./table-commands";

// editor.chain().focus().xxx(...).run()을 흉내 낸다 — 호출된 명령 이름과 인자를 기록한다
function fakeEditor() {
  const calls: Array<[string, unknown[]]> = [];
  const chain: unknown = new Proxy(
    {},
    {
      get: (_, name: string) => (...args: unknown[]) => {
        calls.push([name, args]);
        return name === "run" ? true : chain;
      },
    },
  );
  const editor = { chain: () => chain } as unknown as Editor;
  return { editor, calls };
}

const NONE = { bulletList: false, taskList: false, blockquote: false, link: false, code: false, codeBlock: false };
const state = (over: Partial<ToolbarMoreState> = {}): ToolbarMoreState => ({
  active: NONE,
  inTable: false,
  inCallout: false,
  openLinkPopup: vi.fn(),
  ...over,
});
const find = (items: ReturnType<typeof buildMoreItems>, key: string) => items.find((i) => i.key === key)!;

describe("buildMoreItems", () => {
  it("툴바 뒤쪽 9개를 정해진 순서와 이름으로 만든다 (아이콘 버튼의 접근 가능한 이름이 된다)", () => {
    const { editor } = fakeEditor();
    const items = buildMoreItems(editor, state());
    expect(items.map((i) => i.label)).toEqual([
      "목록", "체크박스", "인용", "링크", "인라인 코드", "코드 블록", "표", "콜아웃", "이미지",
    ]);
    expect(new Set(items.map((i) => i.key)).size).toBe(9);
  });

  it("각 항목이 알맞은 에디터 명령을 실행한다", () => {
    const expected: Record<string, string> = {
      bulletList: "toggleBulletList",
      taskList: "toggleTaskList",
      blockquote: "toggleBlockquote",
      code: "toggleCode",
      codeBlock: "toggleCodeBlock",
      callout: "toggleCallout",
      image: "pickImage",
    };
    for (const [key, command] of Object.entries(expected)) {
      const { editor, calls } = fakeEditor();
      find(buildMoreItems(editor, state()), key).onClick();
      expect(calls.map(([name]) => name)).toEqual(["focus", command, "run"]);
    }
  });

  it("표는 기본 크기로 삽입하고, 링크는 링크 팝업 열기를 호출한다 (에디터 명령을 쓰지 않는다)", () => {
    const table = fakeEditor();
    find(buildMoreItems(table.editor, state()), "table").onClick();
    expect(table.calls).toContainEqual(["insertTable", [DEFAULT_TABLE]]);

    const link = fakeEditor();
    const openLinkPopup = vi.fn();
    find(buildMoreItems(link.editor, state({ openLinkPopup })), "link").onClick();
    expect(openLinkPopup).toHaveBeenCalledTimes(1);
    expect(link.calls).toHaveLength(0);
  });

  it("현재 켜진 서식은 active로, 표 안에서는 표 항목이 비활성이다", () => {
    const { editor } = fakeEditor();
    const items = buildMoreItems(
      editor,
      state({ active: { ...NONE, bulletList: true, link: true }, inTable: true, inCallout: true }),
    );
    expect(find(items, "bulletList").active).toBe(true);
    expect(find(items, "link").active).toBe(true);
    expect(find(items, "blockquote").active).toBe(false);
    expect(find(items, "callout").active).toBe(true);
    expect(find(items, "table").disabled).toBe(true);
    expect(find(buildMoreItems(editor, state()), "table").disabled).toBe(false);
  });
});
