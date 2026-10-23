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

describe("ChatMessages 로딩 표시", () => {
  const waiting = [
    { id: "u1", role: "user" as const, text: "안녕" },
    { id: "a1", role: "assistant" as const, text: "" },
  ];

  it("답변을 기다리는 중(isSending)이고 답변이 비어 있으면 로딩 표시를 보여준다", () => {
    const { getByRole, queryByText } = render(<ChatMessages messages={waiting} isSending />);

    expect(getByRole("status", { name: "답변 작성 중" })).toBeInTheDocument();
    // 빈 답변 말풍선의 복사 버튼이 같이 보이면 안 된다
    expect(queryByText("복사")).toBeNull();
  });

  it("답변 글자가 오기 시작하면 로딩 대신 답변을 보여준다", () => {
    const { queryByRole, getByText } = render(
      <ChatMessages messages={[waiting[0], { ...waiting[1], text: "반가워요" }]} isSending />,
    );

    expect(queryByRole("status")).toBeNull();
    expect(getByText("반가워요")).toBeInTheDocument();
  });

  it("전송 중이 아니면 로딩을 보여주지 않는다", () => {
    const { queryByRole } = render(<ChatMessages messages={waiting} />);

    expect(queryByRole("status")).toBeNull();
  });
});
