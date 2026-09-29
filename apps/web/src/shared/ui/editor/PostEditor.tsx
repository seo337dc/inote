"use client";

import { getMarkRange, type Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useEffect, useRef } from "react";
import { SlashCommand } from "./slash-command";
import { MarkdownPaste } from "./markdown-paste";
import { toggleHeadingOnLine } from "./line-heading";

type Props = {
  content?: string;
  onChange: (html: string) => void;
  // 사용자가 에디터에서 직접 입력·편집했을 때만 호출 (불러온 내용이 정규화되며 onChange가 나가는 경우는 제외)
  onUserEdit?: () => void;
};

// 지금 선택(또는 커서) 근처에 링크가 있으면 그 범위를 돌려준다.
// editor.isActive("link")는 선택 전체가 링크일 때만 true라서, 링크 옆 글자까지 같이 드래그했거나
// 커서가 링크 끝 경계에 있으면 링크가 아니라고 판단해버린다 — 그래서 "범위 안에 링크가 하나라도 있는지"로 본다.
function findLinkRange(editor: Editor): { from: number; to: number } | null {
  const { doc, selection, schema } = editor.state;
  const linkType = schema.marks.link;
  if (!linkType) return null;

  const { from, to, empty } = selection;
  if (!empty) return doc.rangeHasMark(from, to, linkType) ? { from, to } : null;

  // 커서만 있으면 커서가 놓인 링크 전체(경계에 붙어 있는 경우 포함)를 대상으로 한다
  return getMarkRange(doc.resolve(from), linkType) ?? null;
}

type ActiveFormats = {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bold: boolean;
  italic: boolean;
  bulletList: boolean;
  blockquote: boolean;
  code: boolean;
  link: boolean;
  codeBlock: boolean;
};

const NO_ACTIVE: ActiveFormats = {
  h1: false,
  h2: false,
  h3: false,
  bold: false,
  italic: false,
  bulletList: false,
  blockquote: false,
  code: false,
  link: false,
  codeBlock: false,
};

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={Boolean(active)}
      className={`rounded px-2 py-1 text-sm ${
        active ? "bg-zinc-900 font-medium text-white hover:bg-zinc-800" : "hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function PostEditor({ content = "", onChange, onUserEdit }: Props) {
  // 바깥에서 내려준 content를 에디터에 밀어넣는 동안 나오는 update는 사용자 편집이 아님
  const isSyncingRef = useRef(false);
  const editor = useEditor({
    extensions: [
      // 에디터 안에서는 링크를 클릭해도 이동하지 않고 커서만 들어가게 — 그래야 링크 글자를 골라 해제·수정할 수 있음
      StarterKit.configure({ link: { openOnClick: false } }),
      SlashCommand,
      MarkdownPaste,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "내용을 입력하거나 '/'를 입력해 블록을 삽입하세요...",
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      if (!isSyncingRef.current) onUserEdit?.();
    },
    editorProps: {
      attributes: {
        class: "prose prose-zinc max-w-none min-h-[400px] focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      isSyncingRef.current = true;
      try {
        editor.commands.setContent(content);
      } finally {
        isSyncingRef.current = false;
      }
    }
  }, [content, editor]);

  // 커서가 놓인 위치의 서식을 툴바에 표시하려면 선택이 바뀔 때마다 다시 그려야 하는데,
  // Tiptap v3는 기본으로 transaction마다 리렌더하지 않아서 이 구독이 필요하다.
  // 여러 서식이 겹친 자리(굵은 링크, 굵은 목록 항목 등)는 어느 버튼을 켜야 할지 애매해서
  // 표시하지 않고, 서식이 딱 하나일 때만 해당 버튼을 켠다.
  const activeState = useEditorState({
    editor,
    selector: ({ editor }): ActiveFormats => {
      if (!editor) return NO_ACTIVE;
      const formats: ActiveFormats = {
        h1: editor.isActive("heading", { level: 1 }),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        bulletList: editor.isActive("bulletList"),
        blockquote: editor.isActive("blockquote"),
        code: editor.isActive("code"),
        link: findLinkRange(editor) !== null,
        codeBlock: editor.isActive("codeBlock"),
      };
      const activeCount = Object.values(formats).filter(Boolean).length;
      return activeCount === 1 ? formats : NO_ACTIVE;
    },
  });

  if (!editor) return null;

  const active = activeState ?? NO_ACTIVE;

  // 줄바꿈(<br>)으로 이어진 문단에선 누른 줄만 제목으로, 그 외에는 블록 전체를 토글
  const toggleHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().run();
    if (!toggleHeadingOnLine(editor, level)) {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <div className="rounded border border-zinc-200">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 px-2 py-1.5">
        <ToolbarButton
          onClick={() => toggleHeading(1)}
          active={active.h1}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleHeading(2)}
          active={active.h2}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleHeading(3)}
          active={active.h3}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={active.bold}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={active.italic}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={active.bulletList}
        >
          목록
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={active.blockquote}
        >
          인용
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            // 링크가 걸린 곳(선택 범위 안에 링크가 있거나 커서가 링크에 닿음)에서 누르면 해제,
            // 링크가 전혀 없으면 주소를 받아 걸기
            const linkRange = findLinkRange(editor);
            if (linkRange) {
              editor
                .chain()
                .focus()
                .command(({ tr, state }) => {
                  tr.removeMark(linkRange.from, linkRange.to, state.schema.marks.link);
                  return true;
                })
                .run();
              return;
            }
            const href = window.prompt("링크 주소를 입력하세요", "https://")?.trim();
            if (!href) return;
            if (editor.state.selection.empty) {
              editor.chain().focus().insertContent({
                type: "text",
                text: href,
                marks: [{ type: "link", attrs: { href } }],
              }).run();
            } else {
              editor.chain().focus().setLink({ href }).run();
            }
          }}
          active={active.link}
        >
          링크
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={active.code}
        >
          인라인 코드
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={active.codeBlock}
        >
          코드 블록
        </ToolbarButton>
        <span className="ml-auto self-center text-xs text-zinc-400">
          &apos;/&apos;로 블록 삽입
        </span>
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
