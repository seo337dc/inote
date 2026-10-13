"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { TextSelection } from "@tiptap/pm/state";
import { findLinkRange } from "./link-popover";

type Props = {
  editor: Editor;
  // '링크' 버튼 — 툴바의 링크 버튼과 같은 팝업을 연다
  onLink: () => void;
};

// 글자를 드래그해 선택하면 그 위에 뜨는 서식 메뉴 (노션처럼, 위쪽 툴바로 시선을 옮기지 않고 바로 고친다).
// 글자 서식(굵게·기울임·인라인 코드·링크)만 담는다 — 제목·목록 같은 블록 서식은 툴바와 '/' 메뉴가 맡는다.
export function SelectionBubbleMenu({ editor, onLink }: Props) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      code: editor.isActive("code"),
      link: findLinkRange(editor.state) !== null,
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      // 글자가 선택됐을 때만. 코드 블록 안(글자 서식을 못 쓴다)과 표 칸 여러 개 선택(셀 선택)·이미지 같은 노드 선택은 제외
      shouldShow={({ editor, state }) =>
        editor.isEditable &&
        state.selection instanceof TextSelection &&
        !state.selection.empty &&
        !editor.isActive("codeBlock")
      }
      className="z-30 flex items-center gap-0.5 rounded border border-zinc-200 bg-white p-1 shadow-md"
    >
      <BubbleButton
        label="선택 영역 굵게"
        active={active.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </BubbleButton>
      <BubbleButton
        label="선택 영역 기울임"
        active={active.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </BubbleButton>
      <BubbleButton
        label="선택 영역 인라인 코드"
        active={active.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <span className="font-mono">&lt;/&gt;</span>
      </BubbleButton>
      <BubbleButton label="선택 영역 링크" active={active.link} onClick={onLink}>
        링크
      </BubbleButton>
    </BubbleMenu>
  );
}

function BubbleButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // 누르는 순간 에디터가 포커스를 잃으면 선택이 풀려 서식이 적용되지 않는다
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-sm ${
        active ? "bg-zinc-900 font-medium text-white hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}
