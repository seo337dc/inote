import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import HistoryPage from "./HistoryPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { addDays, formatDayHeader, todayKst } from "@/shared/lib/date";
import { useSession } from "@/shared/lib/auth-client";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const yesterday = addDays(todayKst(), -1);

function signedIn() {
  vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as unknown as ReturnType<typeof useSession>);
}

function setup(options: { seed?: boolean } = { seed: true }) {
  const store = createTodoStore({ seed: options.seed });
  server.use(...createTodoHandlers(store));
  signedIn();
  return { store, user: userEvent.setup() };
}

describe("HistoryPage (지난 기록)", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("기록이 있는 날의 카드를 최신순으로 보여주고, 오늘 카드와 입력줄은 없다", async () => {
    setup();
    renderWithQueryClient(<HistoryPage />);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(
      [1, 2, 3, 5].map((n) => formatDayHeader(addDays(todayKst(), -n))),
    );
    expect(screen.queryByText("· 오늘")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("할 일 입력")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /오늘의 할일로/ })).toHaveAttribute("href", "/todos");
  });

  it("지난 카드의 체크박스도 바꿀 수 있고, 서버에 반영된다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<HistoryPage />);

    const card = await screen.findByRole("region", { name: formatDayHeader(yesterday) });
    const box = within(card).getByRole("checkbox", { name: "가계부 작성 완료" });
    expect(box).not.toBeChecked();
    await user.click(box);

    expect(box).toBeChecked();
    await waitFor(() => expect(store.getDay(yesterday).entries.find((e) => e.title === "가계부 작성")?.done).toBe(true));
  });

  it("지난 카드에서 체크가 실패하면 되돌리고 안내한다", async () => {
    const { user } = setup();
    server.use(http.patch("*/api/v1/daily/entries/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<HistoryPage />);

    const card = await screen.findByRole("region", { name: formatDayHeader(yesterday) });
    const box = within(card).getByRole("checkbox", { name: "가계부 작성 완료" });
    await user.click(box);

    await waitFor(() => expect(box).not.toBeChecked());
    expect(toast.error).toHaveBeenCalledWith("체크하지 못했어요.");
  });

  it("다음 쪽이 있으면 [더 보기]로 이어서 불러오고, 끝나면 버튼이 사라진다", async () => {
    const { user } = setup();
    const card = (date: string, title: string) => ({
      date,
      entries: [{ id: `x-${date}`, date, title, done: false, routineId: null }],
    });
    server.use(
      http.get("*/api/v1/daily", ({ request }) => {
        const before = new URL(request.url).searchParams.get("before");
        return HttpResponse.json(
          before
            ? { items: [card("2026-09-01", "오래된 일")], nextBefore: null }
            : { items: [card("2026-10-01", "최근 일")], nextBefore: "2026-10-01" },
        );
      }),
    );
    renderWithQueryClient(<HistoryPage />);

    expect(await screen.findByText("최근 일")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "더 보기" }));

    expect(await screen.findByText("오래된 일")).toBeInTheDocument();
    expect(screen.getByText("최근 일")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("한 쪽으로 끝나면 [더 보기]가 없다", async () => {
    setup();
    renderWithQueryClient(<HistoryPage />);
    await screen.findAllByRole("heading", { level: 2 });
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("지난 기록이 없으면 안내 문구를 보여준다", async () => {
    setup({ seed: false });
    renderWithQueryClient(<HistoryPage />);
    expect(await screen.findByText("아직 지난 기록이 없어요.")).toBeInTheDocument();
  });

  it("불러오지 못하면 안내 문구를 보여준다", async () => {
    signedIn();
    server.use(http.get("*/api/v1/daily", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<HistoryPage />);
    expect(await screen.findByText("지난 기록을 불러오지 못했어요.")).toBeInTheDocument();
  });

  it("로그인하지 않았으면 /login으로 보낸다", () => {
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<typeof useSession>);
    renderWithQueryClient(<HistoryPage />);
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
