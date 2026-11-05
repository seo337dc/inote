import type { Editor } from "@tiptap/react";
import {
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListChecks,
  MessageSquareWarning,
  Quote,
  SquareCode,
  Table as TableIcon,
} from "lucide-react";
import { DEFAULT_TABLE } from "./table-commands";
import type { ToolbarMoreItem } from "./ToolbarMoreMenu";

export type ToolbarMoreState = {
  /** 현재 커서 위치에서 켜져 있는 서식 */
  active: {
    bulletList: boolean;
    taskList: boolean;
    blockquote: boolean;
    link: boolean;
    code: boolean;
    codeBlock: boolean;
  };
  inTable: boolean;
  inCallout: boolean;
  openLinkPopup: () => void;
};

/**
 * 툴바 뒤쪽 아이콘 버튼 9개의 정의(이름·아이콘·동작·켜짐/비활성 상태).
 * 넓은 화면에서는 툴바에 펼쳐지고, 좁은 화면에서는 `…` 팝오버(ToolbarMoreMenu)에 같은 목록이 담긴다.
 */
export function buildMoreItems(
  editor: Editor,
  { active, inTable, inCallout, openLinkPopup }: ToolbarMoreState,
): ToolbarMoreItem[] {
  return [
    {
      key: "bulletList",
      label: "목록",
      icon: List,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      active: active.bulletList,
    },
    {
      key: "taskList",
      label: "체크박스",
      icon: ListChecks,
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      active: active.taskList,
    },
    {
      key: "blockquote",
      label: "인용",
      icon: Quote,
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      active: active.blockquote,
    },
    { key: "link", label: "링크", icon: LinkIcon, onClick: openLinkPopup, active: active.link },
    {
      key: "code",
      label: "인라인 코드",
      icon: Code,
      onClick: () => editor.chain().focus().toggleCode().run(),
      active: active.code,
    },
    {
      key: "codeBlock",
      label: "코드 블록",
      icon: SquareCode,
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      active: active.codeBlock,
    },
    {
      key: "table",
      label: "표",
      icon: TableIcon,
      onClick: () => editor.chain().focus().insertTable(DEFAULT_TABLE).run(),
      disabled: inTable,
    },
    {
      key: "callout",
      label: "콜아웃",
      icon: MessageSquareWarning,
      onClick: () => editor.chain().focus().toggleCallout().run(),
      active: inCallout,
    },
    {
      key: "image",
      label: "이미지",
      icon: ImageIcon,
      onClick: () => editor.chain().focus().pickImage().run(),
    },
  ];
}
