import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ChatMessages from "./ChatMessages";

const FENCE = "```";

function renderAssistant(text: string) {
  return render(<ChatMessages messages={[{ id: "a1", role: "assistant", text }]} />);
}

describe("ChatMessages 코드 렌더링", () => {
  it("언어를 안 붙인 코드블록 안의 code에는 인라인 코드용 밝은 배경이 붙지 않는다", () => {
    // 인라인 코드로 오인되면 어두운 pre 위에 밝은 배경 + 밝은 글자가 겹쳐 글자가 안 보인다
    const { container } = renderAssistant(`${FENCE}\nA → B\nC → D\n${FENCE}`);

    const code = container.querySelector("pre > code");
    expect(code).not.toBeNull();
    expect(code!.className).not.toMatch(/bg-zinc-200/);
  });

  it("언어를 붙인 코드블록은 언어 클래스를 유지한다", () => {
    const { container } = renderAssistant(`${FENCE}ts\nconst a = 1;\n${FENCE}`);

    expect(container.querySelector("pre > code")).toHaveClass("language-ts");
  });

  it("인라인 코드는 pre 밖에서 밝은 배경 스타일을 유지한다", () => {
    const { container } = renderAssistant("`useState`를 쓴다");

    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code!.closest("pre")).toBeNull();
    expect(code!.className).toMatch(/bg-zinc-200/);
  });
});
