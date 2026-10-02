// 쿼리 파라미터(?page=2 등)를 1 이상의 정수로 바꾼다 — 없거나 이상한 값이면 1.
export function toPageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return Math.max(1, Math.floor(Number(raw)) || 1);
}

// 검색어 쿼리 파라미터(?q=) — 앞뒤 공백을 지우고, 비어 있으면 null. 최대 100자 (BE 계약과 같음).
export const SEARCH_QUERY_MAX = 100;
export function toSearchQuery(value: string | string[] | undefined): string | null {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  return raw ? raw.slice(0, SEARCH_QUERY_MAX) : null;
}
