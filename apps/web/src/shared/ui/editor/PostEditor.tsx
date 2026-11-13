"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "@/shared/lib/useMediaQuery";
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
import { SelectionBubbleMenu } from "./SelectionBubbleMenu";
import { ToolbarMoreMenu } from "./ToolbarMoreMenu";
import { buildMoreItems, type ToolbarMoreState } from "./toolbar-items";
import { toolbarButtonClass } from "./toolbar-button-style";
import { TOOLBAR_SHORTCUTS } from "./toolbar-shortcuts";
import { ShortcutTooltip } from "./ShortcutTooltip";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Callout } from "./CalloutView";
import { TABLE_OPTIONS } from "./table-commands";
import { ResizableImage } from "./image-extension";
import { ImageUpload } from "./image-upload-extension";
import { uploadPostImage } from "./image-upload";

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
  strike: boolean;
  bulletList: boolean;
  taskList: boolean;
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
  strike: false,
  bulletList: false,
  taskList: false,
  blockquote: false,
  code: false,
  link: false,
  codeBlock: false,
};

// 입력 중 커서가 화면 가장자리에 닿기 전에 미리 스크롤하기 위한 여백(px). ProseMirror 기본값(threshold 0, margin 5)이면
// 커서가 화면 맨 아래에 붙은 채로 입력된다. top은 sticky 툴바(데스크톱 1280px 기준 약 65px)에 커서가 가려지지 않게,
// bottom은 글쓰기 화면의 sticky 저장 바(약 72px)에 가려지지 않게 그보다 크게 잡았다. 툴바가 더 많이 줄바꿈되는 폭에서는 부족할 수 있다.
const SCROLL_PADDING = { top: 80, bottom: 160, left: 0, right: 0 };

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  hint,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  // 아이콘만 있는 버튼의 접근 가능한 이름·툴팁 (글자 버튼은 생략)
  label?: string;
  // 마우스를 올리면 이름과 단축키를 보여주는 말풍선. 있으면 브라우저 기본 툴팁(title)은 쓰지 않아 두 번 뜨지 않는다
  hint?: { label: string; shortcut: string };
  children: React.ReactNode;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      title={hint ? undefined : label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={Boolean(active)}
      className={`${toolbarButtonClass(active, "shrink-0 whitespace-nowrap px-2 py-1 text-sm")} ${
        active ? "font-medium" : ""
      }`}
    >
      {children}
    </button>
  );
  return hint ? (
    <ShortcutTooltip label={hint.label} shortcut={hint.shortcut}>
      {button}
    </ShortcutTooltip>
  ) : (
    button
  );
}

// 툴바 뒤쪽 아이콘 버튼 9개. 넓은 화면은 툴바에 펼쳐 보이고(ToolbarIconButtons), 좁은 화면은 `…` 팝오버에 담긴다(ToolbarMore).
// 항목 정의는 buildMoreItems 한 곳이고, 링크 팝업을 여는 함수(ref를 쓴다)를 렌더 중에 함수 인자로 넘기지 않도록 컴포넌트 props로 받는다.
function ToolbarIconButtons({ editor, state }: { editor: Editor; state: ToolbarMoreState }) {
  return buildMoreItems(editor, state).map(({ key, label, icon: Icon, onClick, active, disabled, shortcut }) => (
    <ToolbarButton
      key={key}
      label={label}
      hint={shortcut ? { label, shortcut } : undefined}
      onClick={onClick}
      active={active}
      disabled={disabled}
    >
      <Icon className="size-4" aria-hidden />
    </ToolbarButton>
  ));
}

function ToolbarMore({ editor, state }: { editor: Editor; state: ToolbarMoreState }) {
  return <ToolbarMoreMenu items={buildMoreItems(editor, state)} />;
}

export default function PostEditor({ content = "", onChange, onUserEdit }: Props) {
  // 바깥에서 내려준 content를 에디터에 밀어넣는 동안 나오는 update는 사용자 편집이 아님
  const isSyncingRef = useRef(false);
  // sm 미만이면 툴바 뒤쪽 아이콘 버튼을 `…` 팝오버로 접는다 (matchMedia가 없는 환경·서버에서는 false = 펼친 툴바)
  const isNarrow = useMediaQuery("(max-width: 639px)");
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
      ImageUpload.configure({
        upload: uploadPostImage,
        onError: (message: string) => toast.error(message),
      }),
      MarkdownPaste,
      ResizableImage,
      Table.configure(TABLE_OPTIONS),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      // 체크리스트(할 일 목록) — 줄 맨 앞에서 "[] "·"[ ] "·"[x] "를 치거나 슬래시 메뉴로 만든다(입력 규칙은 TaskItem 기본).
      // nested: Tab/Shift+Tab으로 들여쓰기. 읽기 화면에서는 체크박스가 눌리지 않는다(shared/lib/task-list)
      TaskList,
      TaskItem.configure({ nested: true }),
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
      scrollThreshold: SCROLL_PADDING,
      scrollMargin: SCROLL_PADDING,
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
    if (!editor || content === editor.getHTML()) return;
    // 바깥에서 content가 바뀌면(수정 화면에서 글을 불러온 뒤 등) 에디터 내용을 맞춘다.
    // 내용에 React 노드뷰(콜아웃)가 있으면 Tiptap이 그릴 때 flushSync를 쓰는데, 효과(useEffect) 안에서 부르면
    // React가 "flushSync was called from inside a lifecycle method" 오류를 낸다 → 효과가 끝난 직후(마이크로태스크)에 넣는다.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed || content === editor.getHTML()) return;
      isSyncingRef.current = true;
      try {
        editor.commands.setContent(content);
      } finally {
        isSyncingRef.current = false;
      }
    });
    return () => {
      cancelled = true;
    };
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
        strike: editor.isActive("strike"),
        bulletList: editor.isActive("bulletList"),
        taskList: editor.isActive("taskList"),
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

  // 콜아웃 안인지는 서식 상태(activeState)와 따로 구독한다 — 콜아웃 안의 제목·목록에서도 버튼이 켜져 있어야 해서
  const inCallout = useEditorState({
    editor,
    selector: ({ editor }) => editor?.isActive("callout") ?? false,
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

  // 링크 글자 위(또는 링크를 포함한 선택)면 그 링크를 고치는 팝업, 아니면 새 링크 팝업 — 툴바와 선택 메뉴가 같이 쓴다
  const openLinkPopup = () => {
    if (!wrapperRef.current) return;
    const state = computeLinkPopup(editor.view, wrapperRef.current);
    if (state) setLinkPopup({ id: ++popupIdRef.current, state });
  };

  // 툴바 뒤쪽 버튼(전부 아이콘)이 쓰는 현재 상태
  const moreState: ToolbarMoreState = {
    active,
    inTable: Boolean(inTable),
    inCallout: Boolean(inCallout),
    openLinkPopup,
  };

  // 줄바꿈(<br>)으로 이어진 문단에선 누른 줄만 제목으로, 그 외에는 블록 전체를 토글
  const toggleHeading = (level: 1 | 2 | 3 | 4) => {
    editor.chain().focus().run();
    if (!toggleHeadingOnLine(editor, level)) {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  return (
    // 바깥 래퍼의 아래 여백: 마지막 줄 아래에도 스크롤할 공간을 둬서 커서가 sticky 저장 바 위로 올라오게 한다.
    // 테두리 박스 안에 넣으면 박스가 그만큼 길어 보이므로 박스 바깥에 둔다.
    <div className="pb-[40vh]">
      <div ref={wrapperRef} className="relative rounded border border-zinc-200">
        {/* 글이 길어져 스크롤해도 서식 버튼이 항상 보이도록 위에 고정한다 (스크롤 컨테이너는 main).
            좁은 화면에서는 여러 줄로 줄바꿈하면 고정 영역이 커지므로 한 줄 가로 스크롤로 둔다 */}
        {/* 단축키 말풍선은 마우스를 올리고 0.4초 뒤에 뜬다 (Provider는 DOM을 만들지 않는다) */}
        <TooltipProvider delay={400}>
        <div className="sticky top-0 z-20 flex rounded-t border-b border-zinc-200 bg-white">
          <div className="hide-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto px-2 py-1.5 sm:flex-wrap sm:overflow-x-visible">
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
            hint={{ label: "굵게", shortcut: TOOLBAR_SHORTCUTS.bold.key }}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={active.italic}
            hint={{ label: "기울임", shortcut: TOOLBAR_SHORTCUTS.italic.key }}
          >
            I
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={active.strike}
            hint={{ label: "취소선", shortcut: TOOLBAR_SHORTCUTS.strike.key }}
          >
            취소선
          </ToolbarButton>
          {!isNarrow && <ToolbarIconButtons editor={editor} state={moreState} />}
          <span className="ml-auto hidden shrink-0 self-center whitespace-nowrap pl-2 text-xs text-zinc-400 lg:inline">
            &apos;/&apos;로 블록 삽입
          </span>
          </div>
          {isNarrow && <ToolbarMore editor={editor} state={moreState} />}
        </div>
        </TooltipProvider>
        <EditorContent editor={editor} className="px-4 py-3" />
        <SelectionBubbleMenu editor={editor} onLink={openLinkPopup} />
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
    </div>
  );
}
