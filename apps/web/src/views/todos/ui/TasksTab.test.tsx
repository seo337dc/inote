import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import TasksTab from "./TasksTab";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { addDays, formatDateRange, todayKst } from "@/shared/lib/date";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const TODAY = todayKst();
// 일정이 없는 작업의 달력은 이번 달로 열린다 — 10·15·20일은 어떤 달에도 그 달 칸에 있어서 날짜가 바뀌어도 테스트가 흔들리지 않는다
const THIS_MONTH = TODAY.slice(0, 7);
type Store = ReturnType<typeof createTodoStore>;

// 가짜 서버(MSW)에 실제로 요청을 보내는 화면 테스트 — 낙관적 업데이트 뒤 서버 상태까지 확인한다.
function setup(options: { seed?: boolean } = { seed: true }) {
  const store = createTodoStore({ seed: options.seed });
  server.use(...createTodoHandlers(store));
  return { store, user: userEvent.setup() };
}

const region = (name: string) => screen.getByRole("region", { name });
const findGroup = (store: Store, name: string) => store.listGroups().find((g) => g.name === name)!;
const findTask = (store: Store, group: string, title: string) => findGroup(store, group).tasks.find((t) => t.title === title);

// 달력 팝업에서 날짜 버튼을 누른다 — 보이는 달에 없으면 다음 달로 넘겨서 찾는다
async function pickDay(user: ReturnType<typeof userEvent.setup>, date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const label = new RegExp(`^${y}년 ${m}월 ${d}일`);
  for (let i = 0; i < 3 && !screen.queryByRole("button", { name: label }); i += 1) {
    await user.click(screen.getByRole("button", { name: "다음 달로 이동" }));
  }
  await user.click(screen.getByRole("button", { name: label }));
}

// 날짜가 고정된 작업 하나만 있는 화면 — 오늘 날짜와 상관없이 달력 테스트가 항상 같게 돌도록
async function renderWithTask(dates: { startDate: string | null; endDate: string | null }) {
  const store = createTodoStore({ seed: false });
  const group = store.createGroup("G");
  const result = store.createTask(group.id, { title: "T", ...dates });
  if (!result.ok) throw new Error("작업 만들기 실패");
  server.use(...createTodoHandlers(store));
  renderWithQueryClient(<TasksTab />);
  await screen.findByRole("button", { name: "새 묶음" });
  const user = userEvent.setup();
  await user.click(within(region("G")).getByRole("button", { name: "G", expanded: false }));
  return { store, user, card: within(region("G")) };
}
const taskT = (store: Store) => findTask(store, "G", "T");

async function renderLoaded(options?: { seed?: boolean }) {
  const ctx = setup(options);
  renderWithQueryClient(<TasksTab />);
  await screen.findByRole("button", { name: "새 묶음" });
  return ctx;
}

// 묶음 카드는 처음엔 접혀 있다 — 이름 줄을 눌러 펼친 뒤 카드 안을 돌려준다
async function open(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(region(name)).getByRole("button", { name, expanded: false }));
  return within(region(name));
}

const scrollIntoView = vi.fn();

describe("TasksTab (할 일 탭)", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    scrollIntoView.mockClear();
    // jsdom에는 scrollIntoView가 없다 — 이동 동작은 호출 여부로 확인한다
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  describe("보여주기", () => {
    it("'오늘 일정'에는 일정에 오늘이 드는 작업이 모인다 — 시작일만 있으면 그날 하루, 기간이면 기간 안의 매일", async () => {
      await renderLoaded();

      const schedule = within(region("오늘 일정"));
      expect(schedule.getByText("DB 세팅")).toBeInTheDocument(); // 시작일만 = 오늘
      expect(schedule.getByText("할일 페이지 개발")).toBeInTheDocument(); // 오늘이 낀 기간
      expect(schedule.getByText(formatDateRange(TODAY, addDays(TODAY, 4)))).toBeInTheDocument();
      expect(schedule.queryByText("API 개발")).not.toBeInTheDocument(); // 사흘 뒤 시작
      expect(schedule.queryByText("포트폴리오 정리")).not.toBeInTheDocument(); // 어제 시작(시작일만이라 오늘엔 안 나옴)
      expect(schedule.getAllByText("사이드프로젝트")).toHaveLength(2); // 줄마다 묶음 칩
    });

    it("묶음은 처음엔 모두 접힌 목록이고, 이름·완료/전체 개수만 보인다", async () => {
      await renderLoaded();

      for (const name of ["사이드프로젝트", "이직 준비", "기존 할일"]) {
        const card = within(region(name));
        expect(card.getByRole("button", { name, expanded: false })).toBeInTheDocument();
        expect(card.queryByRole("list")).not.toBeInTheDocument(); // 작업 목록이 없다
        expect(card.queryByLabelText(`${name}에 작업 추가`)).not.toBeInTheDocument(); // 입력줄도 없다
      }
      expect(within(region("사이드프로젝트")).getByText("0/3")).toBeInTheDocument();
      expect(within(region("이직 준비")).getByText("1/2")).toBeInTheDocument();
    });

    it("이름 줄을 누르면 펼쳐지고 다시 누르면 접힌다 (묶음마다 따로)", async () => {
      const { user } = await renderLoaded();

      const side = await open(user, "사이드프로젝트");
      expect(side.getByRole("button", { name: "사이드프로젝트", expanded: true })).toBeInTheDocument();
      expect(side.getByText("API 개발")).toBeInTheDocument();
      expect(side.getByText("3개 중 0개 완료")).toBeInTheDocument();
      // 다른 묶음은 접힌 채로
      expect(within(region("이직 준비")).queryByText("포트폴리오 정리")).not.toBeInTheDocument();

      await user.click(side.getByRole("button", { name: "사이드프로젝트", expanded: true }));

      expect(side.queryByText("API 개발")).not.toBeInTheDocument();
      expect(side.getByRole("button", { name: "사이드프로젝트", expanded: false })).toBeInTheDocument();
    });

    it("펼친 카드는 상태별로 나누지 않고 한 목록이다 — 완료된 작업도 같은 자리에 '완료' 뱃지로 남는다", async () => {
      const { user } = await renderLoaded();
      const job = await open(user, "이직 준비");

      expect(job.queryByRole("heading", { name: "진행 중" })).not.toBeInTheDocument();
      expect(job.queryByRole("heading", { name: "할 일" })).not.toBeInTheDocument();
      expect(job.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
        expect.stringContaining("포트폴리오 정리"),
        expect.stringContaining("이력서 제출"),
      ]); // 만든 순서 그대로(상태·일정으로 자동 정렬하지 않음)
      expect(within(job.getByText("이력서 제출").closest("li")!).getByText("완료")).toBeInTheDocument();
    });

    it("상태는 색상 뱃지다 (할 일 회색 · 진행 중 파랑 · 완료 초록)", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");
      const job = await open(user, "이직 준비");

      const badge = (card: typeof side, title: string, label: string) => within(card.getByText(title).closest("li")!).getByText(label);
      expect(badge(side, "DB 세팅", "할 일").className).toContain("bg-zinc-100");
      expect(badge(side, "할일 페이지 개발", "진행 중").className).toContain("bg-blue-50");
      expect(badge(job, "이력서 제출", "완료").className).toContain("bg-green-50");
    });

    it("펼친 묶음 카드의 작업에는 순서 손잡이가 있고, '오늘 일정'에는 없다", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      expect(side.getByRole("button", { name: "DB 세팅 순서 변경" })).toBeInTheDocument();
      expect(within(region("오늘 일정")).queryByRole("button", { name: /순서 변경/ })).not.toBeInTheDocument();
    });

    it("종료일(없으면 시작일)이 지났는데 안 끝난 작업의 일정 칩은 빨갛게 보인다", async () => {
      const { user } = await renderLoaded();
      const job = await open(user, "이직 준비");

      const row = job.getByText("포트폴리오 정리").closest("li")!;
      expect(within(row).getByText(/^\d+\.\d+\.$/).className).toContain("text-red-700");
    });

    it("오늘 일정에 드는 작업이 없으면 '오늘 일정' 영역을 그리지 않는다", async () => {
      const { store } = setup({ seed: false });
      const group = store.createGroup("사이드");
      store.createTask(group.id, { title: "나중에", startDate: addDays(TODAY, 5), endDate: null });
      renderWithQueryClient(<TasksTab />);

      await screen.findByRole("region", { name: "사이드" });

      expect(screen.queryByRole("region", { name: "오늘 일정" })).not.toBeInTheDocument();
    });

    it("묶음이 하나도 없으면 '+ 새 묶음'만 보인다", async () => {
      await renderLoaded({ seed: false });

      expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    it("목록을 불러오지 못하면 안내 문구를 보여준다", async () => {
      server.use(http.get("*/api/v1/task-groups", () => HttpResponse.json({ message: "x" }, { status: 500 })));
      renderWithQueryClient(<TasksTab />);

      expect(await screen.findByText("할 일을 불러오지 못했어요.")).toBeInTheDocument();
    });
  });

  describe("중요(별) 표시", () => {
    it("묶음 이름 옆에 별이 있고, 켜진 묶음은 '해제'로 보인다", async () => {
      await renderLoaded();

      expect(within(region("사이드프로젝트")).getByRole("button", { name: "사이드프로젝트 묶음 중요 표시 해제", pressed: true })).toBeInTheDocument();
      expect(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 중요 표시", pressed: false })).toBeInTheDocument();
    });

    it("묶음 별을 누르면 바로 바뀌고 서버에도 저장되며, 접힌 상태·목록 순서는 그대로다", async () => {
      const { store, user } = await renderLoaded();
      const orderBefore = store.listGroups().map((g) => g.name);

      await user.click(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 중요 표시" }));

      expect(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 중요 표시 해제", pressed: true })).toBeInTheDocument();
      expect(within(region("이직 준비")).getByRole("button", { name: "이직 준비", expanded: false })).toBeInTheDocument();
      await waitFor(() => expect(findGroup(store, "이직 준비").starred).toBe(true));
      expect(store.listGroups().map((g) => g.name)).toEqual(orderBefore); // 별은 표시만 한다(정렬에 영향 없음)
    });

    it("작업에도 별이 있고, 누르면 같은 작업이 나오는 '오늘 일정'에도 반영된다(데이터는 하나)", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.click(side.getByRole("button", { name: "DB 세팅 중요 표시" }));

      expect(side.getByRole("button", { name: "DB 세팅 중요 표시 해제", pressed: true })).toBeInTheDocument();
      expect(within(region("오늘 일정")).getByRole("button", { name: "DB 세팅 중요 표시 해제", pressed: true })).toBeInTheDocument();
      await waitFor(() => expect(findTask(store, "사이드프로젝트", "DB 세팅")?.starred).toBe(true));
    });

    it("별을 켜도 작업 순서는 바뀌지 않는다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.click(side.getByRole("button", { name: "API 개발 중요 표시" }));

      expect(side.getAllByRole("listitem").map((li) => li.textContent?.match(/할일 페이지 개발|DB 세팅|API 개발/)?.[0])).toEqual([
        "할일 페이지 개발",
        "DB 세팅",
        "API 개발",
      ]);
      await waitFor(() => expect(findTask(store, "사이드프로젝트", "API 개발")?.starred).toBe(true));
    });

    it("별 표시가 실패하면 되돌리고 안내한다", async () => {
      const { user } = await renderLoaded();
      server.use(http.patch("*/api/v1/task-groups/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));

      await user.click(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 중요 표시" }));

      await waitFor(() =>
        expect(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 중요 표시", pressed: false })).toBeInTheDocument(),
      );
      expect(toast.error).toHaveBeenCalledWith("중요 표시를 바꾸지 못했어요.");
    });
  });

  describe("작업 상태", () => {
    it("상태 뱃지를 눌러 '완료'를 고르면 같은 자리에서 뱃지가 바뀌고 합계도 갱신되며 서버에도 저장된다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.click(side.getByRole("button", { name: "DB 세팅 상태: 할 일" }));
      await user.click(await screen.findByRole("menuitem", { name: "완료" }));

      expect(side.getByText("3개 중 1개 완료")).toBeInTheDocument();
      expect(side.getByRole("button", { name: "DB 세팅 상태: 완료" })).toBeInTheDocument();
      expect(side.getAllByRole("listitem").map((li) => li.textContent)[1]).toContain("DB 세팅"); // 자리를 지킨다
      await waitFor(() => expect(findTask(store, "사이드프로젝트", "DB 세팅")?.status).toBe("DONE"));
    });

    it("'오늘 일정'에서 바꾸면 펼친 묶음 카드에도 같은 상태로 반영된다(데이터는 하나)", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");
      const schedule = within(region("오늘 일정"));

      await user.click(schedule.getByRole("button", { name: "DB 세팅 상태: 할 일" }));
      await user.click(await screen.findByRole("menuitem", { name: "진행 중" }));

      expect(side.getByRole("button", { name: "DB 세팅 상태: 진행 중" })).toBeInTheDocument();
      expect(schedule.getByRole("button", { name: "DB 세팅 상태: 진행 중" })).toBeInTheDocument();
    });

    it("상태 변경이 실패하면 이전 상태로 되돌리고 안내한다", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");
      server.use(http.patch("*/api/v1/tasks/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));

      await user.click(side.getByRole("button", { name: "DB 세팅 상태: 할 일" }));
      await user.click(await screen.findByRole("menuitem", { name: "완료" }));

      await waitFor(() => expect(side.getByRole("button", { name: "DB 세팅 상태: 할 일" })).toBeInTheDocument());
      expect(toast.error).toHaveBeenCalledWith("상태를 바꾸지 못했어요.");
    });
  });

  describe("작업 추가", () => {
    it("[일정 추가]를 눌러 달력에서 기간을 고르고 추가하면, 기간 칩과 함께 보이고 서버에 저장된다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.type(side.getByLabelText("사이드프로젝트에 작업 추가"), "배포 설정");
      await user.click(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" }));
      await pickDay(user, `${THIS_MONTH}-10`);
      await pickDay(user, `${THIS_MONTH}-20`);
      await user.click(side.getByRole("button", { name: "추가" }));

      const month = Number(THIS_MONTH.slice(5));
      expect(side.getByText("배포 설정")).toBeInTheDocument();
      expect(side.getByText(`${month}.10. ~ ${month}.20.`)).toBeInTheDocument();
      expect(side.getByLabelText("사이드프로젝트에 작업 추가")).toHaveValue("");
      await waitFor(() =>
        expect(findTask(store, "사이드프로젝트", "배포 설정")).toMatchObject({
          status: "TODO",
          startDate: `${THIS_MONTH}-10`,
          endDate: `${THIS_MONTH}-20`,
          starred: false,
        }),
      );
    });

    it("시작일만 고르고 닫으면 종료일 없이 추가된다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.type(side.getByLabelText("사이드프로젝트에 작업 추가"), "리뷰");
      await user.click(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" }));
      await pickDay(user, `${THIS_MONTH}-15`);
      await user.click(await screen.findByRole("button", { name: "닫기" }));
      await user.click(side.getByRole("button", { name: "추가" }));

      await waitFor(() =>
        expect(findTask(store, "사이드프로젝트", "리뷰")).toMatchObject({ startDate: `${THIS_MONTH}-15`, endDate: null }),
      );
    });

    it("입력줄에는 날짜 입력칸 대신 [일정 추가] 텍스트 버튼만 있고, 일정을 고르면 버튼 자리에 날짜가 보인다", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      expect(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" })).toHaveTextContent("일정 추가");
      expect(side.queryByLabelText(/작업 시작일|작업 종료일/)).not.toBeInTheDocument();

      await user.click(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" }));
      await pickDay(user, `${THIS_MONTH}-15`);
      await user.click(await screen.findByRole("button", { name: "닫기" }));

      const month = Number(THIS_MONTH.slice(5));
      expect(side.getByRole("button", { name: `사이드프로젝트 작업 일정 변경 (${month}.15.)` })).toHaveTextContent(`${month}.15.`);
    });

    it("입력줄에서 고른 일정은 '추가'를 누르기 전에는 서버에 저장되지 않고, 추가한 뒤에는 일정 선택이 비워진다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");
      const before = findGroup(store, "사이드프로젝트").tasks.length;

      await user.type(side.getByLabelText("사이드프로젝트에 작업 추가"), "임시");
      await user.click(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" }));
      await pickDay(user, `${THIS_MONTH}-15`);
      await user.click(await screen.findByRole("button", { name: "닫기" }));
      expect(findGroup(store, "사이드프로젝트").tasks).toHaveLength(before); // 아직 안 만들어짐

      await user.click(side.getByRole("button", { name: "추가" }));

      await waitFor(() => expect(findGroup(store, "사이드프로젝트").tasks).toHaveLength(before + 1));
      expect(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" })).toHaveTextContent("일정 추가"); // 초기화
    });

    it("[일정 지우기]로 고른 일정을 빼고 추가하면 일정 없이 만들어진다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.type(side.getByLabelText("사이드프로젝트에 작업 추가"), "정리");
      await user.click(side.getByRole("button", { name: "사이드프로젝트 작업 일정 추가" }));
      await pickDay(user, `${THIS_MONTH}-15`);
      await user.click(await screen.findByRole("button", { name: "일정 지우기" }));
      await user.click(side.getByRole("button", { name: "추가" }));

      await waitFor(() => expect(findTask(store, "사이드프로젝트", "정리")).toMatchObject({ startDate: null, endDate: null }));
    });

    it("날짜 없이도 추가되고 (Enter로도 추가), 빈 제목은 추가하지 않는다", async () => {
      const { store, user } = await renderLoaded();
      const job = await open(user, "이직 준비");
      const input = job.getByLabelText("이직 준비에 작업 추가");
      const before = findGroup(store, "이직 준비").tasks.length;

      await user.type(input, "   {Enter}");
      expect(findGroup(store, "이직 준비").tasks).toHaveLength(before);

      await user.type(input, "면접 준비{Enter}");
      await waitFor(() => expect(findTask(store, "이직 준비", "면접 준비")).toMatchObject({ startDate: null, endDate: null }));
    });
  });

  describe("작업 수정·삭제", () => {
    it("⋯ 메뉴의 '이름 수정'으로 작업 이름을 바꾼다", async () => {
      const { store, user } = await renderLoaded();
      const job = await open(user, "이직 준비");

      await user.click(job.getByRole("button", { name: "포트폴리오 정리 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "이름 수정" }));
      const input = job.getByLabelText("작업 이름");
      await user.clear(input);
      await user.type(input, "포트폴리오 다듬기{Enter}");

      expect(await job.findByText("포트폴리오 다듬기")).toBeInTheDocument();
      await waitFor(() => expect(findTask(store, "이직 준비", "포트폴리오 다듬기")).toBeDefined());
    });

    it("⋯ 메뉴의 '삭제'로 작업을 지운다", async () => {
      const { store, user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      await user.click(side.getByRole("button", { name: "API 개발 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "삭제" }));

      await waitFor(() => expect(side.queryByText("API 개발")).not.toBeInTheDocument());
      expect(findTask(store, "사이드프로젝트", "API 개발")).toBeUndefined();
    });
  });

  describe("묶음 관리", () => {
    it("'+ 새 묶음'에 이름을 쓰고 Enter를 치면 빈 묶음이 생기고 바로 펼쳐져 작업을 넣을 수 있다", async () => {
      const { store, user } = await renderLoaded();

      await user.click(screen.getByRole("button", { name: "새 묶음" }));
      await user.type(screen.getByLabelText("새 묶음 이름"), "공부{Enter}");

      const card = within(await screen.findByRole("region", { name: "공부" }));
      expect(await card.findByLabelText("공부에 작업 추가")).toBeInTheDocument(); // 펼쳐져 있다
      expect(card.getByText("아직 작업이 없어요")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "새 묶음" })).toBeInTheDocument(); // 입력줄이 닫히고 점선 카드로 돌아옴
      await waitFor(() => expect(store.listGroups().some((g) => g.name === "공부")).toBe(true));
    });

    it("취소하거나 Esc를 누르면 묶음을 만들지 않고 닫힌다", async () => {
      const { store, user } = await renderLoaded();
      const before = store.listGroups().length;

      await user.click(screen.getByRole("button", { name: "새 묶음" }));
      await user.type(screen.getByLabelText("새 묶음 이름"), "만들다 말기{Escape}");

      expect(screen.queryByLabelText("새 묶음 이름")).not.toBeInTheDocument();
      expect(store.listGroups()).toHaveLength(before);
    });

    it("헤더 ⋯ 메뉴의 '이름 변경'으로 묶음 이름을 바꾼다 (별 표시는 유지)", async () => {
      const { store, user } = await renderLoaded();

      await user.click(within(region("사이드프로젝트")).getByRole("button", { name: "사이드프로젝트 묶음 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "이름 변경" }));
      const input = screen.getByLabelText("묶음 이름");
      await user.clear(input);
      await user.type(input, "사이드 프로젝트{Enter}");

      const card = await screen.findByRole("region", { name: "사이드 프로젝트" });
      expect(within(card).getByRole("button", { name: "사이드 프로젝트 묶음 중요 표시 해제", pressed: true })).toBeInTheDocument();
      await waitFor(() => expect(findGroup(store, "사이드 프로젝트")).toMatchObject({ starred: true }));
    });

    it("삭제하면 '작업 N개도 함께' 확인 창이 뜨고, 취소하면 그대로 남는다", async () => {
      const { store, user } = await renderLoaded();

      await user.click(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "삭제" }));

      expect(await screen.findByText("'이직 준비' 묶음과 작업 2개가 함께 삭제돼요. 되돌릴 수 없어요.")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(screen.queryByText("묶음을 삭제할까요?")).not.toBeInTheDocument();
      expect(region("이직 준비")).toBeInTheDocument();
      expect(store.listGroups().some((g) => g.name === "이직 준비")).toBe(true);
    });

    it("확인 창에서 삭제하면 묶음과 안의 작업이 함께 사라진다", async () => {
      const { store, user } = await renderLoaded();

      await user.click(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "삭제" }));
      await user.click(await screen.findByRole("button", { name: "삭제" }));

      await waitFor(() => expect(screen.queryByRole("region", { name: "이직 준비" })).not.toBeInTheDocument());
      expect(store.listGroups().some((g) => g.name === "이직 준비")).toBe(false);
    });

    it("묶음 삭제가 실패하면 되돌리고 안내한다", async () => {
      const { user } = await renderLoaded();
      server.use(http.delete("*/api/v1/task-groups/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));

      await user.click(within(region("이직 준비")).getByRole("button", { name: "이직 준비 묶음 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "삭제" }));
      await user.click(await screen.findByRole("button", { name: "삭제" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("묶음을 삭제하지 못했어요."));
      expect(await screen.findByRole("region", { name: "이직 준비" })).toBeInTheDocument();
    });
  });

  describe("오늘 일정의 줄 모양과 묶음으로 이동", () => {
    it("줄은 '상태 뱃지 · 묶음 이름 · 작업 제목' 순서이고, 묶음 이름은 누를 수 있는 버튼이다", async () => {
      await renderLoaded();

      const row = within(region("오늘 일정")).getByText("DB 세팅").closest("li")!;
      const badge = within(row).getByRole("button", { name: "DB 세팅 상태: 할 일" });
      const groupButton = within(row).getByRole("button", { name: "사이드프로젝트 묶음으로 이동" });
      const title = within(row).getByText("DB 세팅");
      const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

      expect(before(badge, groupButton)).toBe(true);
      expect(before(groupButton, title)).toBe(true);
    });

    it("묶음 카드 안의 작업 줄에는 묶음 이름 버튼이 없다 (이미 그 묶음 안이라서)", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");

      expect(side.queryByRole("button", { name: /묶음으로 이동/ })).not.toBeInTheDocument();
    });

    it("묶음 이름을 누르면 접혀 있던 그 카드가 펼쳐지고 그 위치로 스크롤한다", async () => {
      const { user } = await renderLoaded();
      expect(within(region("사이드프로젝트")).getByRole("button", { name: "사이드프로젝트", expanded: false })).toBeInTheDocument();

      await user.click(within(region("오늘 일정")).getAllByRole("button", { name: "사이드프로젝트 묶음으로 이동" })[0]);

      expect(within(region("사이드프로젝트")).getByRole("button", { name: "사이드프로젝트", expanded: true })).toBeInTheDocument();
      expect(within(region("사이드프로젝트")).getByText("API 개발")).toBeInTheDocument();
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
      expect(scrollIntoView.mock.contexts[0]).toBe(region("사이드프로젝트"));
      expect(within(region("이직 준비")).getByRole("button", { name: "이직 준비", expanded: false })).toBeInTheDocument(); // 다른 묶음은 그대로
    });

    it("이미 펼쳐진 카드의 이름을 눌러도 접히지 않고 그 위치로만 이동한다", async () => {
      const { user } = await renderLoaded();
      await open(user, "사이드프로젝트");

      await user.click(within(region("오늘 일정")).getAllByRole("button", { name: "사이드프로젝트 묶음으로 이동" })[0]);

      expect(within(region("사이드프로젝트")).getByRole("button", { name: "사이드프로젝트", expanded: true })).toBeInTheDocument();
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    });
  });

  describe("일정 달력 팝업", { timeout: 20_000 }, () => {
    it("날짜 칩을 누르면 그 일정이 있는 달의 달력 팝업이 열린다", async () => {
      const { user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });

      await user.click(card.getByRole("button", { name: "T 일정 변경 (6.10. ~ 6.12.)" }));

      const dialog = within(await screen.findByRole("dialog", { name: "T 일정 선택" }));
      expect(dialog.getByRole("button", { name: /^2030년 6월 10일/ })).toBeInTheDocument();
      expect(dialog.getByRole("button", { name: "일정 지우기" })).toBeEnabled();
    });

    it("일정이 없는 작업은 날짜 칩이 없고 ⋯ 메뉴의 '일정 변경'으로 같은 달력을 연다", async () => {
      const { user, card } = await renderWithTask({ startDate: null, endDate: null });
      expect(card.queryByRole("button", { name: /일정 변경 \(/ })).not.toBeInTheDocument();

      await user.click(card.getByRole("button", { name: "T 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "일정 변경" }));

      const dialog = within(await screen.findByRole("dialog", { name: "T 일정 선택" }));
      expect(dialog.queryByText(/종료일을 누르|시작일을 누르세요/)).not.toBeInTheDocument(); // 안내 문구는 두지 않는다
      expect(dialog.getByRole("button", { name: "일정 지우기" })).toBeDisabled();
    });

    it("시작일을 누르고 이어서 종료일을 누르면 기간이 저장되고 팝업이 닫힌다", async () => {
      const { store, user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });
      await user.click(card.getByRole("button", { name: /T 일정 변경/ }));

      await pickDay(user, "2030-06-20");
      await pickDay(user, "2030-06-25");

      await waitFor(() => expect(taskT(store)).toMatchObject({ startDate: "2030-06-20", endDate: "2030-06-25" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(card.getByRole("button", { name: "T 일정 변경 (6.20. ~ 6.25.)" })).toBeInTheDocument();
    });

    it("시작일만 누르면 바로 하루 일정으로 저장되고 팝업은 종료일을 기다리며 열려 있다 — 같은 날을 한 번 더 누르면 닫힌다", async () => {
      const { store, user, card } = await renderWithTask({ startDate: null, endDate: null });
      await user.click(card.getByRole("button", { name: "T 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "일정 변경" }));

      await pickDay(user, `${THIS_MONTH}-20`);

      await waitFor(() => expect(taskT(store)).toMatchObject({ startDate: `${THIS_MONTH}-20`, endDate: null }));
      expect(screen.getByRole("dialog")).toBeInTheDocument(); // 종료일을 기다리며 열려 있다

      await pickDay(user, `${THIS_MONTH}-20`);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(taskT(store)).toMatchObject({ startDate: `${THIS_MONTH}-20`, endDate: null });
    });

    it("시작일보다 앞 날짜를 누르면 그날이 새 시작일이 되고 팝업은 계속 열려 있다", async () => {
      const { store, user, card } = await renderWithTask({ startDate: null, endDate: null });
      await user.click(card.getByRole("button", { name: "T 메뉴" }));
      await user.click(await screen.findByRole("menuitem", { name: "일정 변경" }));

      await pickDay(user, `${THIS_MONTH}-20`);
      await pickDay(user, `${THIS_MONTH}-15`);

      await waitFor(() => expect(taskT(store)).toMatchObject({ startDate: `${THIS_MONTH}-15`, endDate: null }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("이미 기간이 있는 작업에서 날짜를 누르면 예전 종료일은 버리고 새 시작일부터 고른다", async () => {
      const { store, user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });
      await user.click(card.getByRole("button", { name: /T 일정 변경/ }));

      await pickDay(user, "2030-06-20");

      await waitFor(() => expect(taskT(store)).toMatchObject({ startDate: "2030-06-20", endDate: null }));
    });

    it("[일정 지우기]로 시작일·종료일을 모두 없애고 닫는다 (날짜 칩도 사라진다)", async () => {
      const { store, user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });
      await user.click(card.getByRole("button", { name: /T 일정 변경/ }));

      await user.click(await screen.findByRole("button", { name: "일정 지우기" }));

      await waitFor(() => expect(taskT(store)).toMatchObject({ startDate: null, endDate: null }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(card.queryByRole("button", { name: /일정 변경 \(/ })).not.toBeInTheDocument();
    });

    it("[닫기]를 누르면 일정은 그대로 두고 팝업만 닫는다", async () => {
      const { store, user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });
      await user.click(card.getByRole("button", { name: /T 일정 변경/ }));

      await user.click(await screen.findByRole("button", { name: "닫기" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(taskT(store)).toMatchObject({ startDate: "2030-06-10", endDate: "2030-06-12" });
    });

    it("'오늘 일정' 영역의 날짜 칩에서도 같은 달력이 열리고, 바꾼 일정은 묶음 카드에도 반영된다", async () => {
      const { user } = await renderLoaded();
      const side = await open(user, "사이드프로젝트");
      const schedule = within(region("오늘 일정"));

      await user.click(schedule.getByRole("button", { name: /^DB 세팅 일정 변경/ }));
      expect(await screen.findByRole("dialog", { name: "DB 세팅 일정 선택" })).toBeInTheDocument();

      await user.click(await screen.findByRole("button", { name: "일정 지우기" }));

      await waitFor(() => expect(schedule.queryByText("DB 세팅")).not.toBeInTheDocument()); // 일정이 없으면 오늘 일정에서 빠진다
      expect(side.getByText("DB 세팅")).toBeInTheDocument(); // 작업 자체는 묶음에 그대로
    });

    it("일정 변경이 실패하면 이전 일정으로 되돌리고 안내한다", async () => {
      const { user, card } = await renderWithTask({ startDate: "2030-06-10", endDate: "2030-06-12" });
      server.use(http.patch("*/api/v1/tasks/:id", () => HttpResponse.json({ message: "x" }, { status: 500 })));
      await user.click(card.getByRole("button", { name: /T 일정 변경/ }));

      await user.click(await screen.findByRole("button", { name: "일정 지우기" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("일정을 바꾸지 못했어요."));
      expect(await card.findByRole("button", { name: "T 일정 변경 (6.10. ~ 6.12.)" })).toBeInTheDocument();
    });
  });
});

describe("TasksTab 묶음 목록 무한 스크롤", () => {
  // 묶음 12개 — 처음엔 10개만 그리고 나머지는 아래로 내릴 때 이어서 그린다(jsdom에는 IntersectionObserver가 없어 [더 보기] 버튼으로 대신한다)
  function manyGroups(withTodayTaskInLast = false) {
    const store = createTodoStore({ seed: false });
    for (let i = 1; i <= 12; i += 1) {
      const group = store.createGroup(`묶음${i}`);
      if (withTodayTaskInLast && i === 12) store.createTask(group.id, { title: "오늘 할 일", startDate: TODAY, endDate: null });
    }
    server.use(...createTodoHandlers(store));
    return userEvent.setup();
  }

  it("처음엔 10개 묶음만 그리고, 이어서 불러오면 나머지가 나온다", async () => {
    const user = manyGroups();
    renderWithQueryClient(<TasksTab />);
    await screen.findByRole("button", { name: "새 묶음" });

    expect(screen.getByRole("region", { name: "묶음10" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "묶음11" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "더 보기" }));

    expect(screen.getByRole("region", { name: "묶음12" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("아직 안 그린 묶음의 작업이 '오늘 일정'에 있어도 나오고, 묶음 이름을 누르면 그 묶음까지 그려서 펼친다", async () => {
    const user = manyGroups(true);
    renderWithQueryClient(<TasksTab />);
    await screen.findByRole("button", { name: "새 묶음" });
    expect(screen.queryByRole("region", { name: "묶음12" })).not.toBeInTheDocument();

    await user.click(within(screen.getByRole("region", { name: "오늘 일정" })).getByRole("button", { name: "묶음12 묶음으로 이동" }));

    const card = await screen.findByRole("region", { name: "묶음12" });
    expect(within(card).getByRole("button", { name: "묶음12", expanded: true })).toBeInTheDocument();
  });

  it("묶음이 10개 이하면 [더 보기]가 없다", async () => {
    setup();
    renderWithQueryClient(<TasksTab />);
    await screen.findByRole("button", { name: "새 묶음" });

    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });
});

