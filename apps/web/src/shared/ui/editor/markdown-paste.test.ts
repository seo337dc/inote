import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Slice } from "@tiptap/pm/model";
import { MarkdownPaste } from "./markdown-paste";

let editor: Editor;

function setup(content: string) {
  editor = new Editor({ extensions: [StarterKit, MarkdownPaste], content });
  return editor;
}

afterEach(() => editor?.destroy());

// 실제 붙여넣기 이벤트 대신, 플러그인의 handlePaste를 클립보드 내용만 흉내 내서 직접 부른다
function paste(data: { "text/plain"?: string; "text/html"?: string }): boolean {
  const event = { clipboardData: { getData: (type: string) => (data as Record<string, string>)[type] ?? "" } };
  return Boolean(
    editor.view.someProp("handlePaste", (f) => f(editor.view, event as unknown as ClipboardEvent, Slice.empty)),
  );
}

// 텍스트(문서 좌표)를 찾아 그 안쪽 offset 칸 뒤에 커서를 둔다
function cursorAt(text: string, offset = 0) {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text?.includes(text)) found = pos + node.text.indexOf(text) + offset;
  });
  if (found < 0) throw new Error(`텍스트를 찾을 수 없음: ${text}`);
  editor.commands.setTextSelection(found);
}

// 코드 블록 안(빈 블록 포함)으로 커서를 옮긴다
function cursorInCodeBlock() {
  let pos = -1;
  editor.state.doc.descendants((node, p) => {
    if (node.type.name === "codeBlock") pos = p + 1;
  });
  editor.commands.setTextSelection(pos);
}

const codeText = () => {
  let text = "";
  editor.state.doc.descendants((node) => {
    if (node.type.name === "codeBlock") text = node.textContent;
  });
  return text;
};

// 코드 뷰어(VS Code 등)는 <pre>가 아니라 줄마다 <div><span>으로 복사한다 → 구조 태그 예외를 타지 못하는 입력
const VIEWER_HTML = '<div style="color:#ccc"><span>const a = 1;</span></div>';
const CODE = "const a = 1;\n# 주석처럼 보이는 줄\n- 목록처럼 보이는 줄\nfunction f() {\n  return a;\n}";

describe("코드 블록 안에서 붙여넣기", () => {
  it("붙여넣은 내용이 코드 블록 안에 들어가고, 블록 밖에는 아무것도 생기지 않는다", () => {
    setup("<p>앞 문단</p><pre><code></code></pre><p>뒤 문단</p>");
    cursorInCodeBlock();

    const handled = paste({ "text/plain": CODE, "text/html": VIEWER_HTML });

    expect(handled).toBe(true);
    expect(codeText()).toBe(CODE);
    expect(editor.getHTML()).toBe(`<p>앞 문단</p><pre><code>${CODE}</code></pre><p>뒤 문단</p>`);
  });

  it("코드 속의 '# ...'·'- ...' 줄을 제목·목록으로 바꾸지 않는다", () => {
    setup("<pre><code></code></pre>");
    cursorInCodeBlock();

    paste({ "text/plain": "# 제목처럼\n- 목록처럼\n1. 번호처럼\n> 인용처럼" });

    const html = editor.getHTML();
    expect(html).not.toMatch(/<h1|<ul|<ol|<blockquote/);
    expect(codeText()).toBe("# 제목처럼\n- 목록처럼\n1. 번호처럼\n> 인용처럼");
  });

  it("들여쓰기와 빈 줄이 그대로 남는다", () => {
    setup("<pre><code></code></pre>");
    cursorInCodeBlock();
    const code = "if (x) {\n\n    run();\n}";

    paste({ "text/plain": code });

    expect(codeText()).toBe(code);
  });

  it("이미 내용이 있는 코드 블록은 커서 위치에 끼워 넣는다", () => {
    setup("<pre><code>function f() {}</code></pre>");
    cursorAt("function f() {", "function f() {".length);

    paste({ "text/plain": "\n  return 1;\n" });

    expect(codeText()).toBe("function f() {\n  return 1;\n}");
  });

  it("글자를 선택한 상태에서 붙여넣으면 선택한 부분을 바꾼다", () => {
    setup("<pre><code>let a = OLD;</code></pre>");
    let from = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.includes("OLD")) from = pos + node.text.indexOf("OLD");
    });
    editor.commands.setTextSelection({ from, to: from + 3 });

    paste({ "text/plain": "NEW" });

    expect(codeText()).toBe("let a = NEW;");
  });

  it("윈도우 줄바꿈(\\r\\n)은 \\n으로 통일해서 넣는다", () => {
    setup("<pre><code></code></pre>");
    cursorInCodeBlock();

    paste({ "text/plain": "a\r\nb\rc" });

    expect(codeText()).toBe("a\nb\nc");
  });

  it("text/plain이 없으면(HTML만 있으면) 직접 처리하지 않고 기본 붙여넣기에 맡긴다", () => {
    setup("<pre><code></code></pre>");
    cursorInCodeBlock();

    expect(paste({ "text/html": VIEWER_HTML })).toBe(false);
  });
});

describe("코드 블록과 다른 블록에 걸쳐 선택한 경우", () => {
  it("코드 블록 '안'으로 보지 않고 기존 방식(마크다운 변환)으로 처리한다", () => {
    setup("<pre><code>abc</code></pre><p>def</p>");
    let from = -1;
    let to = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === "abc") from = pos + 1;
      if (node.isText && node.text === "def") to = pos + 1;
    });
    editor.commands.setTextSelection({ from, to });

    paste({ "text/plain": "# H" });

    // 코드 블록에 글자로 끼워 넣지 않고, 마크다운으로 해석해 제목이 된다
    expect(codeText()).not.toContain("# H");
    expect(editor.getHTML()).toContain("<h1>H</h1>");
  });
});

describe("코드 블록 밖에서는 기존 동작을 유지한다", () => {
  it("마크다운 텍스트는 서식으로 변환된다 (# → 제목, - → 목록)", () => {
    setup("<p></p>");
    editor.commands.setTextSelection(1);

    const handled = paste({ "text/plain": "# 제목\n\n- 항목" });

    expect(handled).toBe(true);
    expect(editor.getHTML()).toMatch(/<h1>제목<\/h1>/);
    expect(editor.getHTML()).toMatch(/<ul>/);
  });

  it("진짜 구조가 있는 HTML(<pre> 등)은 기본 처리에 맡긴다", () => {
    setup("<p>본문</p>");
    cursorAt("본문", 2);

    expect(paste({ "text/plain": "x", "text/html": "<pre><code>x</code></pre>" })).toBe(false);
  });

  it("코드 블록이 문서에 있어도, 커서가 블록 밖에 있으면 그 블록을 건드리지 않는다", () => {
    setup("<p>본문</p><pre><code>keep</code></pre>");
    cursorAt("본문", 2);

    paste({ "text/plain": "추가" });

    expect(codeText()).toBe("keep");
    expect(editor.getText()).toContain("추가");
  });
});

describe("연도처럼 큰 숫자로 시작하는 줄 (번호 목록으로 오인하지 않는다)", () => {
  function pasteIntoEmpty(text: string) {
    setup("<p></p>");
    editor.commands.setTextSelection(1);
    return paste({ "text/plain": text });
  }

  it("'2023. 03 ~ 2024.03'은 2023번 목록이 아니라 문단으로 붙여넣어진다", () => {
    pasteIntoEmpty("2023. 03 ~ 2024.03");

    const html = editor.getHTML();
    expect(html).not.toMatch(/<ol|<li/);
    expect(html).toContain("<p>2023. 03 ~ 2024.03</p>");
  });

  it("연도 줄이 여러 개여도 줄바꿈을 지키며 문단으로 남는다", () => {
    pasteIntoEmpty("2023. 03 ~ 2024.03\n2022. 02 ~ 2023.02");

    const html = editor.getHTML();
    expect(html).not.toMatch(/<ol|<li/);
    expect(html).toContain("2023. 03 ~ 2024.03");
    expect(html).toContain("2022. 02 ~ 2023.02");
  });

  it("앞뒤의 다른 마크다운은 그대로 변환된다", () => {
    pasteIntoEmpty("# 경력\n\n2023. 03 ~ 2024.03\n\n- 항목");

    const html = editor.getHTML();
    expect(html).toContain("<h1>경력</h1>");
    expect(html).toContain("2023. 03 ~ 2024.03");
    expect(html).toMatch(/<ul>/);
    expect(html).not.toMatch(/<ol/);
  });

  it("기준(1000) 바로 아래인 999는 기존처럼 번호 목록이다", () => {
    pasteIntoEmpty("999. 항목");

    expect(editor.getHTML()).toMatch(/<ol start="999">/);
  });

  it("기준(1000) 이상이면 문단이다", () => {
    pasteIntoEmpty("1000. 항목");

    expect(editor.getHTML()).not.toMatch(/<ol/);
    expect(editor.getHTML()).toContain("1000. 항목");
  });

  it("일반 번호 목록(1. 2. 3.)은 그대로 목록이 된다", () => {
    pasteIntoEmpty("1. 하나\n2. 둘\n3. 셋");

    const html = editor.getHTML();
    expect(html).toMatch(/<ol>/);
    expect(html.match(/<li>/g)).toHaveLength(3);
  });

  it("코드 블록 안의 '2023. ...' 줄은 건드리지 않는다", () => {
    pasteIntoEmpty("```\n2023. 03 ~ 2024.03\n```");

    expect(codeText().trim()).toBe("2023. 03 ~ 2024.03");
    expect(editor.getHTML()).not.toMatch(/<ol|<li/);
  });
});
