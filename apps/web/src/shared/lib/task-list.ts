// 체크리스트(할 일 목록)의 체크박스를 읽기 전용으로 만든다 — 글·독서 기록 "상세 화면"용.
//
// 저장된 본문(Tiptap getHTML)의 체크박스는 평범한 <input type="checkbox">라서 그대로 그리면 누를 수 있는데,
// 눌러도 저장되지 않고 화면에서만 바뀌어 "체크가 저장된 줄" 오해를 만든다. disabled를 붙이면 마우스로도
// 키보드(Tab·Space)로도 바꿀 수 없고, 스크린리더에는 "비활성 체크박스"로 읽힌다.
// 체크 상태(checked) 자체는 그대로 둔다 — 에디터에서 체크한 대로 보인다.
//
// 서버(SSR)/클라이언트 어디서든 같은 결과가 나오도록 DOM 없이 문자열로만 처리한다 (toc.ts와 같은 방식 — hydration 불일치 방지).
export function lockTaskCheckboxes(html: string): string {
  return html.replace(/<input\b([^>]*)>/gi, (match, attrs: string) => {
    if (!/\btype\s*=\s*["']?checkbox["']?/i.test(attrs)) return match;
    if (/\bdisabled\b/i.test(attrs)) return match;
    // <input ... /> 처럼 자기 닫힘 표기여도 disabled가 슬래시 앞에 오게 한다
    return `<input${attrs.replace(/\s*\/$/, "")} disabled>`;
  });
}
