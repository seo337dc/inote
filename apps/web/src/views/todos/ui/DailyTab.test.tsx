import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import DailyTab from "./DailyTab";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { todayKst } from "@/shared/lib/date";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// 가짜 서버(MSW)에 실제로 요청을 보내는 화면 테스트 — 낙관적 업데이트 뒤 서버 상태까지 확인한다.
function setup(options: { seed?: boolean } = { seed: true }) {
  const store = createTodoStore({ seed: options.seed });
  server.use(...createTodoHandlers(store));
  return { store, user: userEvent.setup() };
}

describe("DailyTab (오늘의 할일)", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  it("오늘 카드 한 장에 루틴(매일 칩)만 보여주고, 작업 일정은 나오지 않는다", async () => {
    setup();
    renderWithQueryClient(<DailyTab />);

    expect(await screen.findByText("독서")).toBeInTheDocument();
    expect(screen.getByText("가계부 작성")).toBeInTheDocument();
    expect(screen.getAllByText("매일")).toHaveLength(2);
    expect(screen.getByText("· 오늘")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "작업 일정" })).not.toBeInTheDocument();
    expect(screen.getByText("2개 중 0개 완료")).toBeInTheDocument();
  });

  it("체크하면 바로 체크 표시와 합계가 바뀌고, 서버에도 반영된다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("checkbox", { name: "독서 완료" }));

    expect(screen.getByRole("checkbox", { name: "독서 완료" })).toBeChecked();
    expect(screen.getByText("2개 중 1개 완료")).toBeInTheDocument();
    await waitFor(() => expect(store.getDay(todayKst()).entries.find((e) => e.title === "독서")?.done).toBe(true));
  });

  it("체크 요청이 실패하면 체크를 되돌리고 안내한다", async () => {
    setup();
    server.use(http.patch("*/api/v1/daily/entries/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    const { user } = { user: userEvent.setup() };
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("checkbox", { name: "독서 완료" }));

    await waitFor(() => expect(screen.getByRole("checkbox", { name: "독서 완료" })).not.toBeChecked());
    expect(toast.error).toHaveBeenCalledWith("체크하지 못했어요.");
  });

  it("입력줄에 쓰고 Enter를 치면 그날 항목이 바로 추가되고 입력칸이 비워진다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<DailyTab />);

    const input = await screen.findByLabelText("할 일 입력");
    await user.type(input, "이력서 수정{Enter}");

    expect(screen.getByText("이력서 수정")).toBeInTheDocument();
    expect(input).toHaveValue("");
    await waitFor(() =>
      expect(store.getDay(todayKst()).entries.some((e) => e.title === "이력서 수정" && e.routineId === null)).toBe(true),
    );
  });

  it("그날 항목의 ⋯ 메뉴에서 '매일 반복으로 만들기'를 누르면 '매일' 칩이 붙고 서버에 루틴이 생긴다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<DailyTab />);

    await user.type(await screen.findByLabelText("할 일 입력"), "운동{Enter}");
    const row = (await screen.findByText("운동")).closest("li")!;
    expect(within(row).queryByText("매일")).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("button", { name: "운동 메뉴" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "운동 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "매일 반복으로 만들기" }));

    expect(within(row).getByText("매일")).toBeInTheDocument();
    await waitFor(() => expect(store.getDay(todayKst()).entries.find((e) => e.title === "운동")?.routineId).not.toBeNull());
  });

  it("그날 항목의 메뉴에는 '매일 반복으로 만들기'만 있고, 루틴의 메뉴에는 이름 수정·삭제가 있다", async () => {
    const { user } = setup();
    renderWithQueryClient(<DailyTab />);

    await user.type(await screen.findByLabelText("할 일 입력"), "이력서 수정{Enter}");
    await waitFor(() => expect(screen.getByRole("button", { name: "이력서 수정 메뉴" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "이력서 수정 메뉴" }));
    expect(await screen.findAllByRole("menuitem")).toHaveLength(1);
    expect(screen.getByRole("menuitem", { name: "매일 반복으로 만들기" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "독서 메뉴" }));
    expect(await screen.findByRole("menuitem", { name: "이름 수정" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "루틴 삭제" })).toBeInTheDocument();
  });

  it("빈 제목은 추가하지 않는다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<DailyTab />);

    await user.type(await screen.findByLabelText("할 일 입력"), "   {Enter}");

    expect(store.getDay(todayKst()).entries).toEqual([]);
  });

  it("루틴 메뉴에서 이름을 수정하면 오늘 카드의 이름이 바뀐다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "이름 수정" }));
    const input = screen.getByLabelText("루틴 이름");
    await user.clear(input);
    await user.type(input, "책 읽기{Enter}");

    expect(await screen.findByText("책 읽기")).toBeInTheDocument();
    expect(screen.queryByText("독서")).not.toBeInTheDocument();
    await waitFor(() => expect(store.getDay(todayKst()).entries.some((e) => e.title === "책 읽기")).toBe(true));
  });

  it("루틴 삭제를 누르면 오늘 카드에서 사라지고, 어제 기록은 그대로 남는다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "루틴 삭제" }));

    await waitFor(() => expect(screen.queryByText("독서")).not.toBeInTheDocument());
    const yesterday = store.history(null, 1).items[0];
    expect(yesterday.entries.some((e) => e.title === "독서")).toBe(true);
  });

  it("카드를 불러오지 못하면 안내 문구를 보여준다", async () => {
    server.use(http.get("*/api/v1/daily/:date", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<DailyTab />);

    expect(await screen.findByText("오늘의 할일을 불러오지 못했어요.")).toBeInTheDocument();
  });
});
