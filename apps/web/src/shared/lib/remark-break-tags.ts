// LLM이 마크다운 표 칸 안에서 줄바꿈을 `<br>`로 쓰는 경우가 많은데, react-markdown은 날 HTML을 렌더하지 않아
// 화면에 `<br>` 글자가 그대로 보인다. 그 인라인 `<br>`(<br/>, <br /> 포함)만 진짜 줄바꿈 노드로 바꾼다.
// 다른 HTML 태그는 그대로 둔다 — 날 HTML 렌더(rehype-raw)는 켜지 않으므로 XSS 위험이 늘지 않는다.

type MdNode = { type: string; value?: string; children?: MdNode[] };

const BR_TAG = /^<br\s*\/?>$/i;

function replaceBreakTags(node: MdNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) =>
    child.type === "html" && child.value !== undefined && BR_TAG.test(child.value.trim()) ? { type: "break" } : child,
  );
  node.children.forEach(replaceBreakTags);
}

// react-markdown의 remarkPlugins에 그대로 넣는다: remarkPlugins={[remarkGfm, remarkBreakTags]}
export function remarkBreakTags() {
  return (tree: MdNode) => replaceBreakTags(tree);
}
