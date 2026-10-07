"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlashCommand } from "./slash-command";
import { MarkdownPaste } from "./markdown-paste";
import {
  computeLinkHover,
  computeLinkPopup,
  findLinkRange,
  LinkEditButton,
  LinkPopover,
  type LinkHoverState,
  type LinkPopupState,
} from "./link-popover";
import { toggleHeadingOnLine } from "./line-heading";
import { TableToolbar } from "./TableToolbar";
import { DEFAULT_TABLE } from "./table-commands";

type Props = {
  content?: string;
  onChange: (html: string) => void;
  // 사용자가 에디터에서 직접 입력·편집했을 때만 호출 (불러온 내용이 정규화되며 onChange가 나가는 경우는 제외)
  onUserEdit?: () => void;
};

type ActiveFormats = {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  h4: boolean;
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
  h4: false,
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
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={Boolean(active)}
      className={`rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent ${
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
  // 링크 주소 팝업 — 링크 글자에 마우스를 올려 나오는 편집 아이콘이나 툴바 '링크' 버튼을 누르면 글자 아래에 뜬다.
  // (링크 글자를 그냥 클릭하는 건 커서를 옮기려는 동작일 수 있어 팝업을 열지 않는다)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [linkPopup, setLinkPopup] = useState<{ id: number; state: LinkPopupState } | null>(null);
  const popupIdRef = useRef(0);
  const [linkHover, setLinkHover] = useState<LinkHoverState | null>(null);
  const hoverHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHoverHide = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    hoverHideTimer.current = null;
  };
  // 링크에서 아이콘으로 마우스를 옮기는 짧은 사이에는 아이콘이 남아 있게 잠깐 뒤에 지운다
  const hideHoverSoon = () => {
    cancelHoverHide();
    hoverHideTimer.current = setTimeout(() => setLinkHover(null), 200);
  };
  useEffect(
    () => () => {
      if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    },
    [],
  );
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
      handleDOMEvents: {
        mouseover: (view, event) => {
          const anchor = (event.target as HTMLElement | null)?.closest?.("a");
          if (!anchor || !wrapperRef.current) return false;
          cancelHoverHide();
          const state = computeLinkHover(view, wrapperRef.current, anchor as HTMLElement);
          if (state) setLinkHover(state);
          return false;
        },
        mouseout: (_view, event) => {
          if ((event.target as HTMLElement | null)?.closest?.("a")) hideHoverSoon();
          return false;
        },
      },
      attributes: {
        class: "prose prose-zinc prose-compact max-w-none min-h-[400px] focus:outline-none",
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
        h4: editor.isActive("heading", { level: 4 }),
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        bulletList: editor.isActive("bulletList"),
        blockquote: editor.isActive("blockquote"),
        code: editor.isActive("code"),
        link: findLinkRange(editor.state) !== null,
        codeBlock: editor.isActive("codeBlock"),
      };
      const activeCount = Object.values(formats).filter(Boolean).length;
      return activeCount === 1 ? formats : NO_ACTIVE;
    },
  });

  // 표 안에 커서가 있으면 새 표를 넣을 수 없게(표 안에 표가 중첩되는 것을 막기) 따로 구독한다.
  // 위 activeState에 넣지 않는 이유: 그쪽은 서식이 겹치면 전부 꺼 버려서 굵은 글씨가 든 칸에서 판정이 틀어진다
  const inTable = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isActive("table") ?? false,
  });

  const closeLinkPopup = useCallback(
    (refocus: boolean) => {
      setLinkPopup(null);
      if (refocus) editor?.commands.focus();
    },
    [editor],
  );

  if (!editor) return null;

  const active = activeState ?? NO_ACTIVE;

  // 줄바꿈(<br>)으로 이어진 문단에선 누른 줄만 제목으로, 그 외에는 블록 전체를 토글
  const toggleHeading = (level: 1 | 2 | 3 | 4) => {
    editor.chain().focus().run();
    if (!toggleHeadingOnLine(editor, level)) {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    <div ref={wrapperRef} className="relative rounded border border-zinc-200">
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
          onClick={() => toggleHeading(4)}
          active={active.h4}
        >
          H4
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
            // 링크 글자 위(또는 링크를 포함한 선택)면 그 링크를 고치는 팝업, 아니면 새 링크 팝업
            if (!wrapperRef.current) return;
            const state = computeLinkPopup(editor.view, wrapperRef.current);
            if (state) setLinkPopup({ id: ++popupIdRef.current, state });
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
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable(DEFAULT_TABLE).run()}
          disabled={Boolean(inTable)}
        >
          표
        </ToolbarButton>
        <span className="ml-auto self-center text-xs text-zinc-400">
          &apos;/&apos;로 블록 삽입
        </span>
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
      <TableToolbar editor={editor} wrapperRef={wrapperRef} />
      {linkHover && !linkPopup && (
        <LinkEditButton
          state={linkHover}
          onEnter={cancelHoverHide}
          onLeave={hideHoverSoon}
          onEdit={() => {
            if (!wrapperRef.current) return;
            const state = computeLinkPopup(editor.view, wrapperRef.current, linkHover.pos);
            setLinkHover(null);
            if (state) setLinkPopup({ id: ++popupIdRef.current, state });
          }}
        />
      )}
      {linkPopup && (
        <LinkPopover
          key={linkPopup.id}
          editor={editor}
          state={linkPopup.state}
          onClose={closeLinkPopup}
        />
      )}
    </div>
  );
}
