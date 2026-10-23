import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import Markdown from "./Markdown";

const FENCE = "```";

describe("Markdown 코드 렌더링", () => {
  it("언어를 안 붙인 코드블록 안의 code에는 인라인 코드용 배경이 붙지 않는다", () => {
    const { container } = render(<Markdown text={`${FENCE}\nA → B\n${FENCE}`} />);

    const code = container.querySelector("pre > code");
    expect(code).not.toBeNull();
    expect(code!.className).not.toMatch(/bg-zinc-100/);
  });

  it("인라인 코드는 배경 스타일을 유지한다", () => {
    const { container } = render(<Markdown text="`useState`를 쓴다" />);

    expect(container.querySelector("code")!.className).toMatch(/bg-zinc-100/);
  });
});
