// 쿼리 파라미터(?page=2 등)를 1 이상의 정수로 바꾼다 — 없거나 이상한 값이면 1.
export function toPageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return Math.max(1, Math.floor(Number(raw)) || 1);
}
