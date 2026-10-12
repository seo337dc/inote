import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import DailyTab from "./DailyTab";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { todayKst } from "@/shared/lib/date";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// 가짜 서버(MSW)에 실제로 요청을 보내는 화면 테스트 — 낙관적 업데이트 뒤 서버 상태까지 확인한다.
// 기본은 설정 화면에서 고정 리스트를 오늘 카드로 가져온 뒤의 상태(독서·가계부 작성이 일반 항목으로 들어와 있음).
function setup(options: { seed?: boolean } = { seed: true }) {
  const store = createTodoStore({ seed: options.seed });
  if (options.seed !== false) store.importRoutines();
  server.use(...createTodoHandlers(store));
  return { store, user: userEvent.setup() };
}

describe("DailyTab (오늘의 할일)", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("오늘 카드 한 장에 항목만 보여주고(매일 칩 없음), 작업 일정은 나오지 않는다", async () => {
    setup();
    renderWithQueryClient(<DailyTab />);

    expect(await screen.findByText("독서")).toBeInTheDocument();
    expect(screen.getByText("가계부 작성")).toBeInTheDocument();
    expect(screen.queryByText("매일")).not.toBeInTheDocument();
    expect(screen.getByText("· 오늘")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "작업 일정" })).not.toBeInTheDocument();
    expect(screen.getByText("2개 중 0개 완료")).toBeInTheDocument();
  });

  it("오늘 카드가 비어 있어도 고정 리스트는 저절로 들어오지 않고 생성 버튼도 없다", async () => {
    const store = createTodoStore({ seed: true }); // 가져오기 전
    server.use(...createTodoHandlers(store));
    renderWithQueryClient(<DailyTab />);

    expect(await screen.findByText("아직 항목이 없어요")).toBeInTheDocument();
    expect(screen.queryByText("독서")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /생성/ })).not.toBeInTheDocument();
    expect(store.getDay(todayKst()).entries).toEqual([]);
  });

  it("오늘 카드 위에 '지난 기록 보기' 링크가 있고 지난 기록 화면으로 간다", async () => {
    setup();
    renderWithQueryClient(<DailyTab />);

    const link = await screen.findByRole("link", { name: /지난 기록 보기/ });
    expect(link).toHaveAttribute("href", "/todos/history");
    const card = screen.getByRole("region", { name: /\(.\)$/ });
    expect(link.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
      expect(store.getDay(todayKst()).entries.some((e) => e.title === "이력서 수정")).toBe(true),
    );
  });

  it("항목의 ⋯ 메뉴에서 '고정 리스트에 추가'를 누르면 그 제목이 고정 리스트에 복사되고, 카드의 항목은 그대로다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<DailyTab />);

    await user.type(await screen.findByLabelText("할 일 입력"), "운동{Enter}");
    await waitFor(() => expect(screen.getByRole("button", { name: "운동 메뉴" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "운동 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "고정 리스트에 추가" }));

    await waitFor(() => expect(store.listRoutines().map((r) => r.title)).toEqual(["운동"]));
    expect(toast.success).toHaveBeenCalledWith("고정 리스트에 추가했어요.");
    expect(screen.getByText("운동")).toBeInTheDocument();
    expect(screen.queryByText("매일")).not.toBeInTheDocument();
  });

  it("항목 메뉴에는 '고정 리스트에 추가'만 있고, 이름 수정·루틴 삭제는 없다", async () => {
    const { user } = setup();
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));

    expect(await screen.findAllByRole("menuitem")).toHaveLength(1);
    expect(screen.getByRole("menuitem", { name: "고정 리스트에 추가" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "루틴 삭제" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "이름 수정" })).not.toBeInTheDocument();
  });

  it("고정 리스트에 추가하지 못하면 안내한다", async () => {
    const { user } = setup();
    server.use(http.post("*/api/v1/routines", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<DailyTab />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "고정 리스트에 추가" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("고정 리스트에 추가하지 못했어요."));
  });

  it("빈 제목은 추가하지 않는다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<DailyTab />);

    await user.type(await screen.findByLabelText("할 일 입력"), "   {Enter}");

    expect(store.getDay(todayKst()).entries).toEqual([]);
  });

  it("카드를 불러오지 못하면 안내 문구를 보여준다", async () => {
    server.use(http.get("*/api/v1/daily/:date", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<DailyTab />);

    expect(await screen.findByText("오늘의 할일을 불러오지 못했어요.")).toBeInTheDocument();
  });
});
