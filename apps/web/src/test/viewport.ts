/**
 * jsdom에는 matchMedia가 없다 — 데스크톱(lg 이상)/좁은 화면을 흉내 낸다. 모든 미디어쿼리에 같은 답(matches)을 준다.
 * 쿼리 문자열마다 다르게 답해야 하는 테스트(예: max-width만 참)는 그 파일에서 따로 만든다.
 * 테스트가 끝나면 resetViewport()로 지워 다른 테스트에 새지 않게 한다.
 */
export function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

export function resetViewport() {
  // @ts-expect-error 테스트 간 오염 방지 — jsdom 기본에는 matchMedia가 없다
  delete window.matchMedia;
}
