"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { widthPercentAfterDrag } from "./image-resize";

// 글 이미지 노드뷰. 이미지를 누르면 선택되고, 오른쪽 가장자리의 핸들을 좌우로 끌면 본문 폭 대비 %로 크기가 바뀐다(노션 방식).
// 끄는 동안은 화면에서만 바꾸고(깜빡임·자동저장 방지), 손을 떼면 한 번에 저장한다.
export default function ImageView({ node, selected, updateAttributes }: NodeViewProps) {
  const savedWidth = (node.attrs.width as number | null) ?? null;
  const uploading = Boolean(node.attrs.uploadId);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = dragWidth ?? savedWidth;

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const wrap = wrapRef.current;
    const container = wrap?.parentElement;
    if (!wrap || !container) return;

    const startX = event.clientX;
    const startWidth = wrap.getBoundingClientRect().width;
    const containerWidth = container.getBoundingClientRect().width;
    let latest = savedWidth;

    const onMove = (e: PointerEvent) => {
      latest = widthPercentAfterDrag(startWidth, e.clientX - startX, containerWidth);
      setDragWidth(latest);
    };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      setDragWidth(null);
      if (latest !== null && latest !== savedWidth) updateAttributes({ width: latest });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  return (
    <NodeViewWrapper className="image-node my-3">
      <div
        ref={wrapRef}
        contentEditable={false}
        className={`relative inline-block max-w-full align-top ${selected ? "outline outline-2 outline-offset-2 outline-blue-500" : ""}`}
        style={{ width: width ? `${width}%` : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 외부(R2) 이미지, next/image 도메인 설정 없이 바로 표시 */}
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string | null) ?? ""}
          draggable={false}
          className={`block h-auto w-full rounded ${uploading ? "opacity-60" : ""}`}
        />
        {uploading && (
          <div role="status" className="absolute inset-0 flex items-center justify-center text-sm text-zinc-600">
            업로드 중…
          </div>
        )}
        {selected && !uploading && (
          <>
            <div
              data-testid="image-resize-handle"
              aria-label="이미지 크기 조절"
              title="끌어서 크기 조절"
              onPointerDown={startResize}
              className="absolute top-1/2 right-1 h-12 w-2 -translate-y-1/2 cursor-ew-resize touch-none rounded bg-zinc-800/70 hover:bg-zinc-900"
            />
            {dragWidth !== null && (
              <span className="absolute top-1 left-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-xs text-white">{dragWidth}%</span>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
