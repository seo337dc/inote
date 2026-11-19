// 글 상세의 "← 목록으로"가 돌아갈 곳 — 이 탭에서 마지막으로 본 글 목록(홈·나의 글·작성자 페이지)의 주소.
// 브라우저 기록(router.back)은 직전 화면이 다른 글 상세·/write·외부 사이트일 수 있어서 쓰지 않는다.
// sessionStorage라 탭마다 따로이고 탭을 닫으면 사라진다. 막힌 환경(시크릿 모드 등)에서는 조용히 무시한다.
const KEY = "inote:last-list-url";

export function rememberListUrl(url: string): void {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    // 저장소를 못 써도 화면은 동작해야 한다 — 이 경우 "목록으로"는 /로 간다
  }
}

export function getLastListUrl(): string | null {
  try {
    const url = sessionStorage.getItem(KEY);
    // 앱 안의 경로만 허용 — 외부 주소나 `//host` 형태는 무시
    return url && url.startsWith("/") && !url.startsWith("//") ? url : null;
  } catch {
    return null;
  }
}
