import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { renderWithQueryClient } from "@/test/render";
import TodoProposalCard from "./TodoProposalCard";
import type { TodoProposal } from "../model/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const TITLES = ["이력서 작성", "독서모임 가기", "운동하기"];

const initial: TodoProposal = {
  items: TITLES.map((title, i) => ({ id: `i${i}`, title, selected: true })),
  status: "pending",
  addedCount: 0,
  failedCount: 0,
};

// 실제 채팅처럼 카드 상태를 부모(훅)가 들고 있는 모양을 흉내 낸다
function Harness() {
  const [proposal, setProposal] = useState(initial);
  return <TodoProposalCard proposal={proposal} onUpdate={(update) => setProposal(update)} />;
}

// POST /todos 요청 본문(title)을 도착 순서대로 모으고, failTitles에 든 제목은 500으로 실패시킨다
function mockCreateTodos(failTitles: string[] = []) {
  const created: string[] = [];
  server.use(
    http.post(`${TEST_API_URL}/api/v1/todos`, async ({ request }) => {
      const { title } = (await request.json()) as { title: string };
      if (failTitles.includes(title)) return HttpResponse.json({ message: "fail" }, { status: 500 });
      created.push(title);
      return HttpResponse.json({ id: title, title });
    }),
  );
  return created;
}

const addButton = (count: number) => screen.getByRole("button", { name: `${count}개 추가` });

describe("TodoProposalCard", () => {
  beforeEach(() => push.mockClear());

  it("항목이 모두 체크된 채로 보이고, 체크를 해제하면 추가 버튼의 개수가 줄어든다", async () => {
    // 지켜주는 것: 사용자가 원치 않는 항목을 빼고 추가할 수 있는 것
    renderWithQueryClient(<Harness />);
    expect(addButton(3)).toBeEnabled();

    await userEvent.click(screen.getByRole("checkbox", { name: "독서모임 가기" }));

    expect(screen.getByRole("checkbox", { name: "독서모임 가기" })).not.toBeChecked();
    expect(addButton(2)).toBeEnabled();
  });

  it("전부 해제하면 추가 버튼이 비활성화된다", async () => {
    // 지켜주는 것: 아무것도 고르지 않고 추가를 눌러 빈 요청이 나가는 것
    renderWithQueryClient(<Harness />);
    for (const title of TITLES) await userEvent.click(screen.getByRole("checkbox", { name: title }));

    expect(addButton(0)).toBeDisabled();
  });

  it("추가하면 선택한 항목만 만들고, 대화 순서대로 위에서부터 보이게 마지막 항목부터 만든다", async () => {
    // 지켜주는 것: 제외한 항목이 만들어지는 것, 그리고 최신순 목록에서 순서가 뒤집혀 보이는 것
    const created = mockCreateTodos();
    renderWithQueryClient(<Harness />);
    await userEvent.click(screen.getByRole("checkbox", { name: "독서모임 가기" }));

    await userEvent.click(addButton(2));

    await waitFor(() => expect(created).toEqual(["운동하기", "이력서 작성"]));
  });

  it("전부 성공하면 한 줄 요약으로 접히고 할 일 페이지로 이동한다", async () => {
    // 지켜주는 것: 추가 후 채팅은 유지한 채 /todos로 이동하는 흐름, 접힌 뒤 다시 추가해 중복되는 것
    mockCreateTodos();
    renderWithQueryClient(<Harness />);

    await userEvent.click(addButton(3));

    expect(await screen.findByText("3개를 할 일에 추가했어요.")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/todos");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("일부만 실패하면 개수를 알려주고 이동하지 않는다", async () => {
    // 지켜주는 것: 실패 사실을 읽기 전에 다른 페이지로 넘어가 버리는 것
    mockCreateTodos(["독서모임 가기"]);
    renderWithQueryClient(<Harness />);

    await userEvent.click(addButton(3));

    expect(await screen.findByText("3개 중 2개를 추가했어요. 1개는 추가하지 못했어요.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("전부 실패하면 카드를 접지 않고 오류를 알린 뒤 다시 시도할 수 있다", async () => {
    // 지켜주는 것: 서버 오류로 하나도 못 만들었는데 카드가 사라져 다시 시도할 길이 없어지는 것
    mockCreateTodos(TITLES);
    renderWithQueryClient(<Harness />);

    await userEvent.click(addButton(3));

    expect(await screen.findByRole("alert")).toHaveTextContent("추가하지 못했어요");
    expect(addButton(3)).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("취소하면 추가하지 않고 한 줄 요약으로 접힌다", async () => {
    // 지켜주는 것: 취소했는데 요청이 나가는 것
    const created = mockCreateTodos();
    renderWithQueryClient(<Harness />);

    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.getByText("할 일에 추가하지 않았어요.")).toBeInTheDocument();
    expect(created).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });
});
