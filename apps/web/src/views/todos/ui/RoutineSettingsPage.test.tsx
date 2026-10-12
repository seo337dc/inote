import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import RoutineSettingsPage from "./RoutineSettingsPage";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { createTodoHandlers } from "@/mocks/todo/handlers";
import { createTodoStore } from "@/mocks/todo/store";
import { useSession } from "@/shared/lib/auth-client";
import { todayKst } from "@/shared/lib/date";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function setup(options: { seed?: boolean } = { seed: true }) {
  const store = createTodoStore({ seed: options.seed });
  server.use(...createTodoHandlers(store));
  vi.mocked(useSession).mockReturnValue({ data: { user: { id: "u1" } }, isPending: false } as unknown as ReturnType<typeof useSession>);
  return { store, user: userEvent.setup() };
}

describe("RoutineSettingsPage (고정 리스트 설정)", () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
  });

  it("고정 리스트를 보여주고 할 일로 돌아가는 링크가 있다", async () => {
    setup();
    renderWithQueryClient(<RoutineSettingsPage />);

    expect(screen.getByRole("heading", { name: "고정 리스트", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText("독서")).toBeInTheDocument();
    expect(screen.getByText("가계부 작성")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /고정 항목/, level: 2 })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /할 일로/ })).toHaveAttribute("href", "/todos");
  });

  it("비어 있으면 안내 문구를 보여준다", async () => {
    setup({ seed: false });
    renderWithQueryClient(<RoutineSettingsPage />);

    expect(await screen.findByText("아직 고정 항목이 없어요.")).toBeInTheDocument();
  });

  it("입력해서 추가하면 바로 목록에 보이고 서버에 저장되며 입력칸이 비워진다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<RoutineSettingsPage />);

    const input = await screen.findByLabelText("고정 항목 입력");
    await user.type(input, "운동{Enter}");

    expect(screen.getByText("운동")).toBeInTheDocument();
    expect(input).toHaveValue("");
    await waitFor(() => expect(store.listRoutines().map((r) => r.title)).toEqual(["운동"]));
  });

  it("빈 제목은 추가하지 않는다", async () => {
    const { store, user } = setup({ seed: false });
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.type(await screen.findByLabelText("고정 항목 입력"), "   {Enter}");

    expect(store.listRoutines()).toEqual([]);
  });

  it("추가에 실패하면 되돌리고 안내한다", async () => {
    const { user } = setup({ seed: false });
    server.use(http.post("*/api/v1/routines", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.type(await screen.findByLabelText("고정 항목 입력"), "운동{Enter}");

    await waitFor(() => expect(screen.queryByText("운동")).not.toBeInTheDocument());
    expect(toast.error).toHaveBeenCalledWith("고정 항목을 추가하지 못했어요.");
  });

  it("이름 수정을 하면 목록과 서버가 바뀐다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "이름 수정" }));
    const input = screen.getByLabelText("고정 항목 이름");
    await user.clear(input);
    await user.type(input, "책 읽기{Enter}");

    expect(await screen.findByText("책 읽기")).toBeInTheDocument();
    expect(screen.queryByText("독서")).not.toBeInTheDocument();
    await waitFor(() => expect(store.listRoutines().some((r) => r.title === "책 읽기")).toBe(true));
  });

  it("삭제는 확인 창에서 [삭제]를 눌러야 되고, [취소]하면 그대로다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "삭제" }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/그대로 남아요/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.getByText("독서")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "삭제" }));
    dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(screen.queryByText("독서")).not.toBeInTheDocument());
    await waitFor(() => expect(store.listRoutines().some((r) => r.title === "독서")).toBe(false));
  });

  it("불러오지 못하면 안내 문구를 보여준다", async () => {
    setup();
    server.use(http.get("*/api/v1/routines", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<RoutineSettingsPage />);

    expect(await screen.findByText("고정 리스트를 불러오지 못했어요.")).toBeInTheDocument();
  });

  it("로그인하지 않았으면 /login으로 보낸다", () => {
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<typeof useSession>);
    renderWithQueryClient(<RoutineSettingsPage />);

    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("[오늘 카드에 모두 가져오기]를 누르면 제목이 오늘 카드에 새 항목으로 복사되고 오늘의 할일로 이동한다", async () => {
    const { store, user } = setup();
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.click(await screen.findByRole("button", { name: "오늘 카드에 모두 가져오기" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/todos"));
    expect(toast.success).toHaveBeenCalledWith("오늘 카드에 가져왔어요.");
    expect(store.getDay(todayKst()).entries.map((e) => e.title)).toEqual(["독서", "가계부 작성"]);
    // 고정 리스트는 그대로다(복사이므로)
    expect(store.listRoutines()).toHaveLength(2);
  });

  it("고정 항목이 없으면 가져오기 버튼이 비활성이다", async () => {
    setup({ seed: false });
    renderWithQueryClient(<RoutineSettingsPage />);

    expect(await screen.findByRole("button", { name: "오늘 카드에 모두 가져오기" })).toBeDisabled();
  });

  it("가져오기에 실패하면 안내하고 이동하지 않는다", async () => {
    const { user } = setup();
    server.use(http.post("*/api/v1/daily/from-routines", () => HttpResponse.json({ message: "x" }, { status: 500 })));
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.click(await screen.findByRole("button", { name: "오늘 카드에 모두 가져오기" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("오늘 카드에 가져오지 못했어요."));
    expect(push).not.toHaveBeenCalled();
  });

  it("이름 수정·삭제는 이미 가져온 오늘 카드의 항목에 영향을 주지 않는다", async () => {
    const { store, user } = setup();
    store.importRoutines();
    renderWithQueryClient(<RoutineSettingsPage />);

    await user.click(await screen.findByRole("button", { name: "독서 메뉴" }));
    await user.click(await screen.findByRole("menuitem", { name: "삭제" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(store.listRoutines().some((r) => r.title === "독서")).toBe(false));
    expect(store.getDay(todayKst()).entries.some((e) => e.title === "독서")).toBe(true);
  });
});
