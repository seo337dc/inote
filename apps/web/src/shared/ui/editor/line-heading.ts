import type { Editor } from "@tiptap/core";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

// 붙여넣은 글(마크다운 breaks 옵션)은 한 문단 안에서 줄이 <br>(hardBreak)로만 나뉘어 있다.
// 이런 문단에서 기본 toggleHeading을 쓰면 블록 전체가 제목이 되어 누른 줄 아래 텍스트까지 함께 바뀐다.
// 그래서 커서가 놓인 "줄"만 떼어 제목 블록으로 만들고, 앞뒤 줄은 원래 블록 종류로 남긴다.

type Line = PMNode[];

function splitLines(block: PMNode): { lines: Line[]; ranges: { start: number; end: number }[] } {
  const lines: Line[] = [[]];
  const ranges: { start: number; end: number }[] = [{ start: 0, end: 0 }];
  block.forEach((child, offset) => {
    if (child.type.name === "hardBreak") {
      lines.push([]);
      ranges.push({ start: offset + child.nodeSize, end: offset + child.nodeSize });
      return;
    }
    lines[lines.length - 1].push(child);
    ranges[ranges.length - 1].end = offset + child.nodeSize;
  });
  return { lines, ranges };
}

// hardBreak 경계에서 비어 있는 줄(연속된 <br>)은 블록으로 남기지 않고 버린다
function joinLines(lines: Line[], hardBreak: PMNode): PMNode[] {
  let from = 0;
  let to = lines.length;
  while (from < to && lines[from].length === 0) from++;
  while (to > from && lines[to - 1].length === 0) to--;
  const nodes: PMNode[] = [];
  lines.slice(from, to).forEach((line, i) => {
    if (i > 0) nodes.push(hardBreak);
    nodes.push(...line);
  });
  return nodes;
}

// 줄 단위로 처리했으면 true. 줄바꿈이 없거나 블록의 모든 줄이 대상이면 false를 돌려주니
// 호출한 쪽에서 기본 toggleHeading으로 넘기면 된다.
export function toggleHeadingOnLine(editor: Editor, level: 1 | 2 | 3): boolean {
  const { state, view } = editor;
  const { selection, schema } = state;
  const { $from, $to, from, to } = selection;

  const block = $from.parent;
  if (!$from.sameParent($to)) return false;
  if (block.type.name !== "paragraph" && block.type.name !== "heading") return false;
  const hardBreak = schema.nodes.hardBreak;
  if (!hardBreak) return false;

  const { lines, ranges } = splitLines(block);
  if (lines.length < 2) return false;

  const contentStart = $from.start();
  const lineAt = (pos: number) => {
    const rel = pos - contentStart;
    let idx = 0;
    ranges.forEach((r, i) => {
      if (rel >= r.start) idx = i;
    });
    return idx;
  };
  const firstLine = lineAt(from);
  const lastLine = lineAt(to);
  if (firstLine === 0 && lastLine === lines.length - 1) return false;

  const isSameHeading = block.type.name === "heading" && block.attrs.level === level;
  const targetType = isSameHeading ? schema.nodes.paragraph : schema.nodes.heading;
  const targetAttrs = isSameHeading ? undefined : { level };

  const make = (lineGroup: Line[], type = block.type, attrs = block.attrs): PMNode | null => {
    const content = joinLines(lineGroup, hardBreak.create());
    return content.length ? type.create(attrs, Fragment.from(content)) : null;
  };

  const before = make(lines.slice(0, firstLine));
  const target = targetType.create(
    targetAttrs,
    Fragment.from(joinLines(lines.slice(firstLine, lastLine + 1), hardBreak.create())),
  );
  const after = make(lines.slice(lastLine + 1));

  const blockPos = $from.before();
  const nodes = [before, target, after].filter((n): n is PMNode => n !== null);
  const targetStart = blockPos + (before ? before.nodeSize : 0);

  // 원래 커서(선택)가 대상 줄 안에서 차지하던 위치를 새 제목 블록 안에서도 그대로 유지
  const groupStartRel = ranges[firstLine].start;
  const offsetIn = (pos: number) => Math.max(0, pos - contentStart - groupStartRel);
  const maxOffset = target.content.size;

  const tr = state.tr.replaceWith(blockPos, blockPos + block.nodeSize, nodes);
  tr.setSelection(
    TextSelection.create(
      tr.doc,
      targetStart + 1 + Math.min(offsetIn(from), maxOffset),
      targetStart + 1 + Math.min(offsetIn(to), maxOffset),
    ),
  );
  view.dispatch(tr.scrollIntoView());
  return true;
}
