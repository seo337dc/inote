/** 주소 끝의 `/`를 모두 제거한다. 끝에 `/`가 남아 있으면 `${base}/sessions`가 `//sessions`가 되어 Vercel이 308을 돌려준다. */
export function normalizeBaseUrl(url: string | undefined): string {
  return (url ?? "").replace(/\/+$/, "");
}

export const AI_API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_AI_API_URL);
