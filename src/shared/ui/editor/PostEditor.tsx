"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { SlashCommand } from "./slash-command";
import { MarkdownPaste } from "./markdown-paste";

type Props = {
  content?: string;
  onChange: (html: string) => void;
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
      className={`rounded px-2 py-1 text-sm ${
        active ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function PostEditor({ content = "", onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      SlashCommand,
      MarkdownPaste,
      Placeholder.configure({
        placeholder: "내용을 입력하거나 '/'를 입력해 블록을 삽입하세요...",
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-zinc max-w-none min-h-[400px] focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded border border-zinc-200">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          목록
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
        >
          코드
        </ToolbarButton>
        <span className="ml-auto self-center text-xs text-zinc-400">
          &apos;/&apos;로 블록 삽입
        </span>
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
