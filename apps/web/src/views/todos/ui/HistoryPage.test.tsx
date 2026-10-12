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
// 오늘을 2026-10-12로 고정 — 가짜 서버 시드(어제·2·3·5일 전)와 주차·달 계산이 날짜에 흔들리지 않게 한다.
vi.mock("@/shared/lib/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/date")>()),
  todayKst: () => "2026-10-12",
}));

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
      entries: [{ id: `x-${date}`, date, title, done: false }],
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

  it("IntersectionObserver가 있으면 끝에 닿을 때 다음 쪽을 자동으로 불러온다(버튼 없이)", async () => {
    setup();
    const callbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          callbacks.push(cb);
        }
      },
    );
    try {
      const card = (date: string, title: string) => ({
        date,
        entries: [{ id: `x-${date}`, date, title, done: false }],
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
      expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
      await waitFor(() => expect(callbacks.length).toBeGreaterThan(0));
      callbacks[callbacks.length - 1]([{ isIntersecting: true }]);

      expect(await screen.findByText("오래된 일")).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
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

  describe("주차별 탭", () => {
    it("이번 달 카드를 'N주차'로 묶어 최신 주차부터 보여주고, 주차마다 완료 합계를 준다", async () => {
      const { user } = setup();
      renderWithQueryClient(<HistoryPage />);

      await user.click(screen.getByRole("tab", { name: "주차별" }));

      expect(await screen.findByText("2026년 10월")).toBeInTheDocument();
      const weeks = await screen.findAllByRole("region", { name: /주차$/ });
      expect(weeks.map((w) => w.getAttribute("aria-label"))).toEqual(["10월 3주차", "10월 2주차"]);
      expect(within(weeks[0]).getByText("3개 중 1개 완료", { selector: "span" })).toBeInTheDocument();
      expect(within(weeks[1]).getByText("8개 중 7개 완료", { selector: "span" })).toBeInTheDocument();
      // 첫 h2는 주차 제목, 나머지가 날짜 카드
      expect(within(weeks[1]).getAllByRole("heading", { level: 2 }).slice(1).map((h) => h.textContent)).toEqual([
        "10월 10일 (토)",
        "10월 9일 (금)",
        "10월 7일 (수)",
      ]);
    });

    it("이전 달로 가면 그 달 기록을 보여주고, 기록이 없으면 안내한다. 다음 달은 이번 달에서 막힌다", async () => {
      const { user } = setup();
      renderWithQueryClient(<HistoryPage />);
      await user.click(screen.getByRole("tab", { name: "주차별" }));
      await screen.findByText("10월 3주차");
      expect(screen.getByRole("button", { name: "다음 달" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "이전 달" }));

      expect(await screen.findByText("2026년 9월")).toBeInTheDocument();
      expect(await screen.findByText("이 달에는 기록이 없어요.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "다음 달" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "다음 달" }));
      expect(await screen.findByText("10월 3주차")).toBeInTheDocument();
    });

    it("주차 안의 지난 카드도 체크할 수 있고, 서버와 합계에 반영된다", async () => {
      const { store, user } = setup();
      renderWithQueryClient(<HistoryPage />);
      await user.click(screen.getByRole("tab", { name: "주차별" }));

      const card = await screen.findByRole("region", { name: "10월 11일 (일)" });
      await user.click(within(card).getByRole("checkbox", { name: "가계부 작성 완료" }));

      expect(await screen.findByText("3개 중 2개 완료", { selector: "span" })).toBeInTheDocument();
      await waitFor(() => expect(store.getDay("2026-10-11").entries.find((e) => e.title === "가계부 작성")?.done).toBe(true));
    });
  });

  describe("월별 탭", () => {
    it("주차 제목 없이 그 달 카드를 최신순으로 보여준다", async () => {
      const { user } = setup();
      renderWithQueryClient(<HistoryPage />);

      await user.click(screen.getByRole("tab", { name: "월별" }));

      expect(await screen.findByText("2026년 10월")).toBeInTheDocument();
      const headings = await screen.findAllByRole("heading", { level: 2 });
      expect(headings.map((h) => h.textContent)).toEqual(["10월 11일 (일)", "10월 10일 (토)", "10월 9일 (금)", "10월 7일 (수)"]);
      expect(screen.queryByText(/\d주차/)).not.toBeInTheDocument();
    });

    it("불러오지 못하면 안내 문구를 보여준다", async () => {
      const { user } = setup();
      server.use(http.get("*/api/v1/daily", () => HttpResponse.json({ message: "x" }, { status: 500 })));
      renderWithQueryClient(<HistoryPage />);

      await user.click(screen.getByRole("tab", { name: "월별" }));

      expect(await screen.findByText("지난 기록을 불러오지 못했어요.")).toBeInTheDocument();
    });
  });

  describe("전체 탭의 달력 보기", () => {
    async function openCalendar() {
      const ctx = setup();
      renderWithQueryClient(<HistoryPage />);
      await ctx.user.click(screen.getByRole("button", { name: "달력" }));
      await screen.findByRole("button", { name: /10월 11일 \(일\)/ });
      return ctx;
    }

    it("처음엔 리스트고, 전체 탭 아래 [리스트 | 달력]으로 바꾼다. 다른 탭에는 이 선택이 없다", async () => {
      const { user } = setup();
      renderWithQueryClient(<HistoryPage />);

      expect(screen.getByRole("button", { name: "리스트" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "달력" })).toHaveAttribute("aria-pressed", "false");
      await screen.findAllByRole("heading", { level: 2 });

      await user.click(screen.getByRole("tab", { name: "월별" }));
      expect(screen.queryByRole("button", { name: "달력" })).not.toBeInTheDocument();
    });

    it("기록이 있는 날에만 완료 현황이 찍히고, 기록 없는 날은 누를 수 없다", async () => {
      await openCalendar();

      expect(screen.getByText("2026년 10월")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10월 11일 (일), 3개 중 1개 완료" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10월 10일 (토), 3개 중 3개 완료" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /개 중 \d개 완료$/ })).toHaveLength(4);
      expect(screen.getByText("완료 1/3")).toBeInTheDocument();
    });

    it("날짜를 누르면 그날 카드가 팝업으로 열리고, 거기서 체크하면 달력 칸도 바뀐다", async () => {
      const { store, user } = await openCalendar();

      await user.click(screen.getByRole("button", { name: "10월 11일 (일), 3개 중 1개 완료" }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("region", { name: "10월 11일 (일)" })).toBeInTheDocument();
      expect(within(dialog).queryByLabelText("할 일 입력")).not.toBeInTheDocument();

      await user.click(within(dialog).getByRole("checkbox", { name: "가계부 작성 완료" }));

      await waitFor(() => expect(store.getDay("2026-10-11").entries.find((e) => e.title === "가계부 작성")?.done).toBe(true));
      // 팝업이 열려 있는 동안 뒤 화면은 접근성 트리에서 가려지므로 hidden으로 찾는다
      expect(await screen.findByRole("button", { name: "10월 11일 (일), 3개 중 2개 완료", hidden: true })).toBeInTheDocument();
    });

    it("이전 달로 가면 그 달 달력이 나오고, 다음 달은 이번 달에서 막힌다", async () => {
      const { user } = await openCalendar();
      expect(screen.getByRole("button", { name: "다음 달" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: "이전 달" }));

      expect(await screen.findByText("2026년 9월")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryAllByRole("button", { name: /개 중 \d개 완료$/ })).toHaveLength(0));
      expect(screen.getByRole("button", { name: "다음 달" })).toBeEnabled();
    });

    it("불러오지 못하면 안내 문구를 보여준다", async () => {
      const { user } = setup();
      server.use(http.get("*/api/v1/daily", () => HttpResponse.json({ message: "x" }, { status: 500 })));
      renderWithQueryClient(<HistoryPage />);

      await user.click(screen.getByRole("button", { name: "달력" }));

      expect(await screen.findByText("지난 기록을 불러오지 못했어요.")).toBeInTheDocument();
    });
  });
});
