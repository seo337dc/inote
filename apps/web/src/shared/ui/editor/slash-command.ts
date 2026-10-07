import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import SlashCommandMenu, { type SlashCommandMenuRef } from "./SlashCommandMenu";
import { DEFAULT_TABLE } from "./table-commands";

// 글쓰기 화면의 하단 고정 바(sticky bottom-0 z-10)보다는 위, 모달(z-50)보다는 아래에 둔다.
// 화면에 붙는 요소는 메뉴 안쪽 div가 아니라 Tiptap이 감싸는 래퍼라서 z-index는 래퍼에 줘야 적용된다.
export const SLASH_MENU_Z_INDEX = "30";

export type SlashCommandItem = {
  title: string;
  description: string;
  // 한글 제목 말고도 이 이름으로 검색되게 하는 영어 이름·별칭 (예: "/table", "/h1", "/heading")
  keywords?: string[];
  command: (props: { editor: Editor; range: Range }) => void;
};

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: "텍스트",
    description: "일반 문단으로 전환",
    keywords: ["text", "paragraph", "plain"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "제목 1",
    description: "가장 큰 섹션 제목",
    keywords: ["h1", "heading1", "heading"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "제목 2",
    description: "중간 크기 섹션 제목",
    keywords: ["h2", "heading2", "heading"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "제목 3",
    description: "작은 섹션 제목",
    keywords: ["h3", "heading3", "heading"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "글머리 기호 목록",
    description: "점으로 시작하는 목록",
    keywords: ["bullet", "bulleted", "list", "ul", "unordered"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "번호 매기기 목록",
    description: "숫자로 시작하는 목록",
    keywords: ["number", "numbered", "ordered", "list", "ol"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "인용",
    description: "인용구 블록",
    keywords: ["quote", "blockquote"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "코드 블록",
    description: "고정폭 코드 블록",
    keywords: ["code", "codeblock"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "구분선",
    description: "가로줄로 섹션 나누기",
    keywords: ["divider", "hr", "line", "rule", "separator"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "표",
    description: "3x3 표 삽입",
    keywords: ["table", "grid"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable(DEFAULT_TABLE)
        .run(),
  },
];

// 대소문자와 공백을 무시하고 비교한다 — "TABLE"도 "table"로, "제목1"도 "제목 1"로 찾아지게.
// (쿼리에는 공백이 들어올 수 없다: 공백을 치면 메뉴가 닫힌다)
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, "");

// 한글 제목 또는 영어 키워드에 입력한 글자가 들어 있으면 보여준다. 빈 쿼리("/"만 친 상태)는 전부.
export function filterItems(query: string, items: SlashCommandItem[] = COMMAND_ITEMS): SlashCommandItem[] {
  const q = normalize(query);
  if (!q) return items;
  return items.filter((item) =>
    [item.title, ...(item.keywords ?? [])].some((text) => normalize(text).includes(q)),
  );
}

// "/"를 입력하면 노션처럼 블록 삽입 메뉴가 뜨는 슬래시 커맨드 확장.
// @tiptap/suggestion v3의 props.mount()로 위치 계산(Floating UI)까지 알아서 처리됨 —
// 예전 tippy.js 수동 셋업 방식은 더 이상 필요 없음 (설치된 버전 타입 정의로 확인 후 적용).
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let component: ReactRenderer<SlashCommandMenuRef>;
          let unmount: (() => void) | undefined;

          return {
            onStart(props: SuggestionProps<SlashCommandItem, SlashCommandItem>) {
              component = new ReactRenderer(SlashCommandMenu, {
                props,
                editor: props.editor,
              });
              const element = component.element as HTMLElement;
              element.style.zIndex = SLASH_MENU_Z_INDEX;
              unmount = props.mount(element);
            },
            onUpdate(props: SuggestionProps<SlashCommandItem, SlashCommandItem>) {
              component.updateProps(props);
            },
            onKeyDown(props: SuggestionKeyDownProps) {
              if (props.event.key === "Escape") return false;
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              unmount?.();
              component.destroy();
            },
          };
        },
      }),
    ];
  },
});
