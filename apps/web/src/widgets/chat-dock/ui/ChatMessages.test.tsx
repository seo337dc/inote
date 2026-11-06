import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import ChatMessages from "./ChatMessages";

// 카드가 useRouter를 쓴다 — 이 파일의 테스트는 이동을 확인하지 않는다
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

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

describe("ChatMessages 할 일 제안 카드", () => {
  const proposal = {
    items: [{ id: "i1", title: "이력서 작성", selected: true }],
    status: "cancelled" as const,
    addedCount: 0,
    failedCount: 0,
  };

  it("답변 문장 없이 제안만 온 메시지는 빈 말풍선 없이 카드만 보여준다", () => {
    // 지켜주는 것: 모델이 안내 문장 없이 도구만 불렀을 때 복사 버튼만 달린 빈 말풍선이 뜨는 것
    renderWithQueryClient(
      <ChatMessages
        messages={[{ id: "a1", role: "assistant", text: "", todoProposal: proposal }]}
        onUpdateTodoProposal={() => {}}
      />,
    );

    expect(screen.getByText("할 일에 추가하지 않았어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /복사/ })).not.toBeInTheDocument();
  });

  it("카드를 처리하는 곳이 없는 모드(독서 상담)에서는 제안이 와도 카드를 그리지 않는다", () => {
    // 지켜주는 것: 할 일 추가가 없는 모드에서 동작하지 않는 카드가 뜨는 것
    renderWithQueryClient(<ChatMessages messages={[{ id: "a1", role: "assistant", text: "안내", todoProposal: proposal }]} />);

    expect(screen.getByText("안내")).toBeInTheDocument();
    expect(screen.queryByText("할 일에 추가하지 않았어요.")).not.toBeInTheDocument();
  });
});
