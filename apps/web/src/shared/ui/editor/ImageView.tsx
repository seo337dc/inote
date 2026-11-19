"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { MAX_WIDTH_PERCENT, WIDTH_PRESETS, widthPercentAfterDrag } from "./image-resize";

// 글 이미지 노드뷰. 이미지를 누르면 선택되고, 오른쪽 위 모서리의 핸들을 좌우로 끌거나 위쪽 크기 버튼(25·50·75·100%)을 누르면 본문 폭 대비 %로 크기가 바뀐다.
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
          // 높이 0짜리 sticky 띠 — 세로로 긴 이미지를 스크롤해도 크기 장치가 화면 위쪽에 따라온다.
          // top-20은 에디터 상단 sticky 툴바(약 65px) 아래. 띠가 이미지 안에 있어서 이미지를 벗어나면 같이 사라진다.
          <div className="sticky top-20 z-10 h-0">
            <div
              role="toolbar"
              aria-label="이미지 크기"
              onMouseDown={(e) => e.preventDefault()}
              className="absolute top-2 left-2 flex gap-0.5 rounded-md bg-zinc-900/85 p-0.5 shadow"
            >
              {WIDTH_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={(width ?? MAX_WIDTH_PERCENT) === preset}
                  onClick={() => updateAttributes({ width: preset })}
                  className="rounded px-2 py-1 text-xs text-white hover:bg-white/25 aria-pressed:bg-white/30 aria-pressed:font-semibold"
                >
                  {preset}%
                </button>
              ))}
            </div>
            {/* 눈에 보이는 건 지름 16px 원이고, 잡을 수 있는 영역은 24px이다 */}
            <div
              data-testid="image-resize-handle"
              aria-label="이미지 크기 조절"
              title="끌어서 크기 조절"
              onPointerDown={startResize}
              className="group absolute top-1 right-1 flex size-6 cursor-ew-resize touch-none items-center justify-center"
            >
              <span className="size-4 rounded-full border-2 border-white bg-blue-500 shadow group-hover:bg-blue-600" />
            </div>
            {dragWidth !== null && (
              <span className="absolute top-2 right-9 rounded bg-zinc-900/85 px-1.5 py-0.5 text-xs text-white">{dragWidth}%</span>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
