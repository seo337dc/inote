// 이미지 크기 조절 계산 — 크기는 본문 폭 대비 비율(%)로 저장한다 (docs/EDITOR_IMAGE_UPLOAD.md).

export const MIN_WIDTH_PERCENT = 10;
export const MAX_WIDTH_PERCENT = 100;

// 정수로 반올림하고 10~100 사이로 맞춘다. 숫자가 아니면 100(꽉 채움).
export function clampWidthPercent(value: number): number {
  if (!Number.isFinite(value)) return MAX_WIDTH_PERCENT;
  return Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, Math.round(value)));
}

// 오른쪽 핸들을 deltaX(px)만큼 끌었을 때의 새 너비(%). startWidthPx는 끌기 시작할 때 이미지 너비, containerWidthPx는 본문 폭.
// 오른쪽으로 끌면 커지고 왼쪽으로 끌면 작아진다. 본문 폭을 모르면(0) 바꾸지 못하고 100을 돌려준다.
export function widthPercentAfterDrag(startWidthPx: number, deltaX: number, containerWidthPx: number): number {
  if (containerWidthPx <= 0) return MAX_WIDTH_PERCENT;
  return clampWidthPercent(((startWidthPx + deltaX) / containerWidthPx) * 100);
}

// 저장된 HTML의 style에서 너비(%)를 읽는다: "width: 60%" → 60. %가 아니거나 없으면 null.
export function parseWidthPercent(style: string | null | undefined): number | null {
  const match = style?.match(/(?:^|;)\s*width\s*:\s*([\d.]+)%/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? clampWidthPercent(value) : null;
}
