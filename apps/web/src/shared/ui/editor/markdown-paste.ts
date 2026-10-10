import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { marked, type Tokens, type TokensList } from "marked";

// text/html에 진짜 의미있는 블록 구조(제목/목록/표/코드블록 태그)가 없으면
// (예: 코드 뷰어가 줄마다 <div style="color:...">로 문법 강조만 흉내 낸 경우 — <pre>/<code> 없음)
// 그 html은 신뢰하지 않고, text/plain을 marked로 직접 마크다운 변환한다.
// 이미 잘 만들어진 마크업(진짜 마크다운 렌더러에서 복사한 경우)은 그대로 Tiptap 기본 처리에 맡긴다.
const STRUCTURAL_HTML_TAG = /<(h[1-6]|ul|ol|li|table|pre|code|blockquote)[\s>]/i;

// "2023. 03 ~ 2024.03"처럼 줄이 "숫자. "로 시작하면 마크다운에서는 그 숫자(2023)부터 시작하는 번호 목록이 된다.
// 번호 목록의 시작 번호가 이 값 이상이면 목록이 아니라 연도 같은 일반 글자로 보고 문단으로 둔다.
const MAX_LIST_START = 1000;

type Token = Tokens.Generic;

// 연도처럼 큰 번호로 시작하는 번호 목록을 원문 그대로의 문단으로 바꾼다 (목록·인용 안쪽도 같이)
function restoreYearLikeLists(tokens: Token[]): Token[] {
  return tokens.map((token) => {
    if (token.type === "list") {
      const list = token as Tokens.List;
      if (list.ordered && Number(list.start) >= MAX_LIST_START) {
        const text = list.raw.trim();
        return { type: "paragraph", raw: list.raw, text, tokens: marked.Lexer.lexInline(text) };
      }
      list.items.forEach((item) => {
        item.tokens = restoreYearLikeLists(item.tokens);
      });
    } else if (token.type === "blockquote" && token.tokens) {
      token.tokens = restoreYearLikeLists(token.tokens);
    }
    return token;
  });
}

// marked.lexer/parser는 옵션을 기본값과 합치지 않고 통째로 쓰므로(gfm이 빠지면 URL 자동 링크가 꺼진다) 기본값을 직접 깔아 준다
function markdownToHtml(text: string): string {
  const options = { ...marked.getDefaults(), async: false, breaks: true };
  const tokens = marked.lexer(text, options);
  return marked.parser(restoreYearLikeLists(tokens) as TokensList, options);
}

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // 코드 블록 안에서는 마크다운으로 바꾸지 않고 글자 그대로 넣는다.
            // 변환하면 문단·제목·목록 같은 블록이 만들어지는데 코드 블록은 글자만 담을 수 있어서,
            // 내용이 블록 밖(아래)으로 밀려나고 코드 속 "# ..."·"- ..." 줄이 제목·목록으로 망가진다.
            const { $from, $to } = view.state.selection;
            if ($from.parent === $to.parent && $from.parent.type.name === "codeBlock") {
              const plain = clipboardData.getData("text/plain");
              if (!plain) return false;
              view.dispatch(view.state.tr.insertText(plain.replace(/\r\n?/g, "\n")).scrollIntoView());
              return true;
            }

            const html = clipboardData.getData("text/html");
            if (html && STRUCTURAL_HTML_TAG.test(html)) return false;

            const text = clipboardData.getData("text/plain");
            if (!text) return false;

            const parsedHtml = markdownToHtml(text);
            editor.chain().focus().insertContent(parsedHtml).run();
            return true;
          },
        },
      }),
    ];
  },
});
