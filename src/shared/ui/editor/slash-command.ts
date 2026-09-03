import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import SlashCommandMenu, { type SlashCommandMenuRef } from "./SlashCommandMenu";

export type SlashCommandItem = {
  title: string;
  description: string;
  command: (props: { editor: Editor; range: Range }) => void;
};

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: "텍스트",
    description: "일반 문단으로 전환",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "제목 1",
    description: "가장 큰 섹션 제목",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "제목 2",
    description: "중간 크기 섹션 제목",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "제목 3",
    description: "작은 섹션 제목",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "글머리 기호 목록",
    description: "점으로 시작하는 목록",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "번호 매기기 목록",
    description: "숫자로 시작하는 목록",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "인용",
    description: "인용구 블록",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "코드 블록",
    description: "고정폭 코드 블록",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "구분선",
    description: "가로줄로 섹션 나누기",
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function filterItems(query: string): SlashCommandItem[] {
  const q = query.toLowerCase();
  return COMMAND_ITEMS.filter((item) => item.title.toLowerCase().includes(q));
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
              unmount = props.mount(component.element as HTMLElement);
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
