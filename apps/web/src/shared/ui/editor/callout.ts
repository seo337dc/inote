import { mergeAttributes, Node } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

// 콜아웃 — 중요한 내용을 회색 박스와 아이콘으로 강조하는 블록.
// 저장되는 HTML은 <div data-type="callout" data-emoji="💡">…블록들…</div> 이다.
// 글 상세는 이 HTML을 그대로 렌더링하므로 아이콘 요소를 따로 두지 않고 CSS의 ::before가 data-emoji를 그린다.
// 에디터 안에서는 CalloutView(React 노드뷰)가 눌러서 바꿀 수 있는 아이콘 버튼을 그린다.
export const DEFAULT_CALLOUT_EMOJI = "💡";
export const CALLOUT_NODE_NAME = "callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      // 커서가 있는 블록을 콜아웃으로 감싼다. 이미 콜아웃 안이면 중첩하지 않고 아무것도 하지 않는다.
      wrapInCallout: () => ReturnType;
      // 콜아웃 안이면 박스만 벗기고(내용은 남김), 아니면 감싼다.
      toggleCallout: () => ReturnType;
    };
  }
}

// 화면(노드뷰)이 없는 기본 정의 — 스키마·명령·키 처리만 담아서 노드뷰 없이도(테스트 등) 쓸 수 있다.
export const CalloutBase = Node.create({
  name: CALLOUT_NODE_NAME,
  group: "block",
  // 문단·제목·목록·코드 블록·표 등 여러 블록을 담는다 (인용구와 같은 구조)
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: DEFAULT_CALLOUT_EMOJI,
        parseHTML: (element) => element.getAttribute("data-emoji") || DEFAULT_CALLOUT_EMOJI,
        renderHTML: (attributes) => ({ "data-emoji": attributes.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      wrapInCallout:
        () =>
        ({ editor, commands }) => {
          if (editor.isActive(CALLOUT_NODE_NAME)) return false;
          return commands.wrapIn(CALLOUT_NODE_NAME);
        },

      toggleCallout:
        () =>
        ({ state, tr, dispatch, commands, editor }) => {
          if (!editor.isActive(CALLOUT_NODE_NAME)) return commands.wrapIn(CALLOUT_NODE_NAME);

          // 박스 전체를 벗긴다 (내용은 그 자리에 남는다). lift는 선택한 블록만 꺼내서 박스가 둘로 쪼개지므로 쓰지 않는다.
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name !== CALLOUT_NODE_NAME) continue;
            if (dispatch) {
              const before = $from.before(depth);
              const after = $from.after(depth);
              tr.replaceWith(before, after, node.content);
              // 박스의 여는 토큰이 사라져서 안쪽 위치는 1칸 당겨진다. 기본 매핑에 맡기면 선택이 뒤쪽 블록으로 밀려서
              // 다시 토글할 때 엉뚱한 문단이 감싸진다 — 선택을 원래 글자 위에 그대로 둔다.
              const shift = (pos: number) => (pos <= before ? pos : pos < after ? pos - 1 : pos - 2);
              const { from, to } = state.selection;
              tr.setSelection(TextSelection.create(tr.doc, shift(from), shift(to)));
            }
            return true;
          }
          return false;
        },
    };
  },
});
