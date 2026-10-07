import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { CalloutBase, DEFAULT_CALLOUT_EMOJI } from "./callout";

let editor: Editor;

function setup(content: string) {
  editor = new Editor({ extensions: [StarterKit, CalloutBase], content });
  return editor;
}

afterEach(() => editor?.destroy());

// 텍스트(문서 좌표)를 찾아 그 안쪽 offset 칸 뒤에 커서를 둔다
function cursorAt(text: string, offset = 0) {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text?.includes(text)) found = pos + node.text.indexOf(text) + offset;
  });
  if (found < 0) throw new Error(`텍스트를 찾을 수 없음: ${text}`);
  editor.commands.setTextSelection(found);
}

const callouts = () => {
  const found: { emoji: string; text: string }[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "callout") found.push({ emoji: node.attrs.emoji, text: node.textContent });
  });
  return found;
};

describe("저장 형식", () => {
  it("저장된 HTML(div[data-type=callout])을 읽으면 콜아웃 블록이 되고 이모지도 읽는다", () => {
    setup('<div data-type="callout" data-emoji="⚠️"><p>주의하세요</p></div>');

    expect(callouts()).toEqual([{ emoji: "⚠️", text: "주의하세요" }]);
  });

  it("data-emoji가 없으면 기본 아이콘(💡)을 쓴다", () => {
    setup('<div data-type="callout"><p>내용</p></div>');

    expect(callouts()[0].emoji).toBe(DEFAULT_CALLOUT_EMOJI);
    expect(DEFAULT_CALLOUT_EMOJI).toBe("💡");
  });

  it("다시 저장해도 같은 HTML이 나온다 (왕복)", () => {
    setup('<div data-type="callout" data-emoji="📌"><p>메모</p></div>');

    expect(editor.getHTML()).toBe('<div data-emoji="📌" data-type="callout"><p>메모</p></div>');
  });

  it("data-type이 없는 일반 div는 콜아웃이 아니다", () => {
    setup("<div><p>그냥 상자</p></div>");

    expect(callouts()).toEqual([]);
  });

  it("문단뿐 아니라 제목·목록·코드 블록도 담을 수 있다", () => {
    const html =
      '<div data-emoji="💡" data-type="callout"><h2>제목</h2><ul><li><p>항목</p></li></ul><pre><code>code()</code></pre></div>';
    setup(html);

    expect(callouts()).toHaveLength(1);
    expect(editor.getHTML()).toBe(html);
  });
});

describe("감싸기·벗기기", () => {
  it("wrapInCallout: 커서가 있는 문단을 콜아웃으로 감싼다", () => {
    setup("<p>앞</p><p>강조할 내용</p><p>뒤</p>");
    cursorAt("강조할 내용");

    expect(editor.commands.wrapInCallout()).toBe(true);

    expect(editor.getHTML()).toBe(
      '<p>앞</p><div data-emoji="💡" data-type="callout"><p>강조할 내용</p></div><p>뒤</p>',
    );
  });

  it("wrapInCallout: 이미 콜아웃 안이면 중첩하지 않고 아무것도 하지 않는다", () => {
    setup('<div data-type="callout"><p>안쪽</p></div>');
    cursorAt("안쪽");
    const before = editor.getHTML();

    expect(editor.commands.wrapInCallout()).toBe(false);

    expect(editor.getHTML()).toBe(before);
  });

  it("toggleCallout: 문단이면 감싸고, 다시 누르면 박스만 벗기고 내용은 그대로 남는다", () => {
    setup("<p>내용</p><p>뒤</p>");
    cursorAt("내용");

    editor.commands.toggleCallout();
    expect(callouts()).toHaveLength(1);

    editor.commands.toggleCallout();
    expect(callouts()).toEqual([]);
    expect(editor.getHTML()).toBe("<p>내용</p><p>뒤</p>");
  });

  it("toggleCallout: 블록이 여러 개인 콜아웃은 박스 전체를 벗긴다 (둘로 쪼개지 않는다)", () => {
    setup('<div data-type="callout"><p>첫째</p><p>둘째</p><p>셋째</p></div><p>뒤</p>');
    cursorAt("둘째");

    editor.commands.toggleCallout();

    expect(callouts()).toEqual([]);
    expect(editor.getHTML()).toBe("<p>첫째</p><p>둘째</p><p>셋째</p><p>뒤</p>");
  });

  it("toggleCallout: 이모지를 바꾼 콜아웃도 벗기면 내용만 남고, 다시 감싸면 기본 아이콘으로 돌아간다", () => {
    setup('<div data-type="callout" data-emoji="🔥"><p>내용</p></div><p>뒤</p>');
    cursorAt("내용");

    editor.commands.toggleCallout();
    editor.commands.toggleCallout();

    // 벗기고 다시 감싸도 같은 문단이 감싸진다 (선택이 내용 위에 남아 있다는 뜻)
    expect(callouts()).toEqual([{ emoji: "💡", text: "내용" }]);
  });

  it("두 문단에 걸쳐 선택하고 감싸면 하나의 콜아웃에 함께 들어간다", () => {
    setup("<p>첫째</p><p>둘째</p><p>셋째</p>");
    let from = -1;
    let to = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === "첫째") from = pos + 1;
      if (node.isText && node.text === "둘째") to = pos + 2;
    });
    editor.commands.setTextSelection({ from, to });

    editor.commands.wrapInCallout();

    expect(editor.getHTML()).toBe(
      '<div data-emoji="💡" data-type="callout"><p>첫째</p><p>둘째</p></div><p>셋째</p>',
    );
  });
});

describe("편집 동작", () => {
  it("이모지를 바꾸면(updateAttributes) 저장되는 HTML의 data-emoji도 바뀐다", () => {
    setup('<div data-type="callout"><p>내용</p></div>');
    cursorAt("내용");

    editor.commands.updateAttributes("callout", { emoji: "✅" });

    expect(editor.getHTML()).toContain('data-emoji="✅"');
    expect(callouts()[0].emoji).toBe("✅");
  });

  it("콜아웃 안에서 Enter를 누르면 같은 박스 안에 새 문단이 생긴다", () => {
    setup('<div data-type="callout"><p>첫 줄</p></div><p>뒤</p>');
    cursorAt("첫 줄", "첫 줄".length);

    editor.commands.keyboardShortcut("Enter");

    expect(editor.getHTML()).toBe('<div data-emoji="💡" data-type="callout"><p>첫 줄</p><p></p></div><p>뒤</p>');
  });

  it("빈 문단에서 Enter를 한 번 더 누르면 박스를 빠져나와 아래에 새 문단이 생긴다", () => {
    setup('<div data-type="callout"><p>첫 줄</p><p></p></div><p>뒤</p>');
    let pos = -1;
    editor.state.doc.descendants((node, p) => {
      if (node.type.name === "paragraph" && node.content.size === 0) pos = p + 1;
    });
    editor.commands.setTextSelection(pos);

    editor.commands.keyboardShortcut("Enter");

    expect(editor.getHTML()).toBe('<div data-emoji="💡" data-type="callout"><p>첫 줄</p></div><p></p><p>뒤</p>');
  });
});
