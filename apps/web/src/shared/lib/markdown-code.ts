import type { ReactNode } from "react";

// react-markdown v10에는 inline 플래그가 없어서 code 컴포넌트가 직접 구분해야 한다.
// 언어를 붙인 코드블록은 className(language-xx)이 있지만, 언어 없는 코드블록(```만 쓴 것)은
// className이 없어서 className만 보면 인라인 코드로 오인된다 — 그러면 어두운 pre 위에
// 인라인용 밝은 배경이 깔려 글자가 안 보인다.
// 코드블록(fenced)의 내용은 마크다운 → HTML 변환 과정에서 항상 끝에 줄바꿈이 붙고,
// 인라인 코드는 줄바꿈이 공백으로 바뀌어서 줄바꿈이 없다.
export function isInlineCode(className: string | undefined, children: ReactNode): boolean {
  if (className) return false;
  return !String(children ?? "").includes("\n");
}
