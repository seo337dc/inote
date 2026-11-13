export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };

type Options = {
  min: Size;
  /** 화면 가장자리와 띄울 간격(px). */
  margin?: number;
  /** 아래쪽만 따로 띄울 간격(px). 하단 고정 버튼 위에 패널을 띄울 때 쓴다. 기본은 margin. */
  bottomInset?: number;
  /**
   * 기준이 되는 요소(예: 열기 버튼)의 오른쪽 끝·위쪽 끝(뷰포트 좌표).
   * 주면 화면 모서리 대신 이 요소의 오른쪽에 맞춰 바로 위에 띄운다.
   */
  anchor?: { right: number; top: number };
  /** anchor와 패널 사이 간격(px). */
  anchorGap?: number;
  /** true면 화면 가운데에 놓는다(큰 패널). anchor보다 우선한다. */
  centered?: boolean;
};

/**
 * 플로팅 패널을 처음 열 때의 위치·크기 — 기본은 화면 오른쪽 아래, anchor를 주면 그 요소의 바로 위.
 * 요청한 크기가 화면보다 크면 (화면 - 여백)으로 줄이되 min 아래로는 줄이지 않고,
 * 위치는 화면 밖으로 나가지 않게(0 이상) 보정한다. centered면 화면 가운데.
 */
export function initialPanelRect(
  viewport: Size,
  size: Size,
  { min, margin = 16, bottomInset = margin, anchor, anchorGap = 8, centered }: Options,
): Rect {
  const width = Math.max(min.width, Math.min(size.width, viewport.width - margin * 2));
  const height = Math.max(min.height, Math.min(size.height, viewport.height - margin - bottomInset));
  if (centered) {
    return {
      width,
      height,
      x: Math.max(0, Math.round((viewport.width - width) / 2)),
      y: Math.max(0, Math.round((viewport.height - height) / 2)),
    };
  }
  if (anchor) {
    return {
      width,
      height,
      x: Math.max(0, Math.min(anchor.right - width, viewport.width - width - margin)),
      y: Math.max(0, Math.min(anchor.top - height - anchorGap, viewport.height - height - bottomInset)),
    };
  }
  return {
    width,
    height,
    x: Math.max(0, viewport.width - width - margin),
    y: Math.max(0, viewport.height - height - bottomInset),
  };
}
