import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import MemosPage from "./MemosPage";
import { renderWithQueryClient as render } from "@/test/render";
import { server } from "@/test/msw/server";
import { makeMemo, MEMOS_URL } from "@/test/fixtures/memo";
import { useSession } from "@/shared/lib/auth-client";

// 메모 관리 — 전체/일반/글/독서 탭, 카드 목록, 카드를 누르면 대상으로 이동. 계약: docs/todo/memo.md 3차
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

function setSession(loggedIn: boolean) {
  vi.mocked(useSession).mockReturnValue({
    data: loggedIn ? { user: { id: "u1" } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

const general = (id: string, over = {}) => makeMemo({ id, targetType: "general", targetId: "", targetTitle: null, ...over });
const onPost = (id: string, over = {}) => makeMemo({ id, targetType: "post", targetId: "p1", targetTitle: "글 제목", ...over });
const onReading = (id: string, over = {}) => makeMemo({ id, targetType: "reading", targetId: "r1", targetTitle: "책 제목", ...over });
const serve = (memos: ReturnType<typeof makeMemo>[]) => server.use(http.get(MEMOS_URL, () => HttpResponse.json(memos)));

const tab = (name: RegExp | string) => screen.getByRole("tab", { name });
const cards = () => within(screen.getByRole("list")).getAllByRole("listitem");

beforeEach(() => {
  vi.clearAllMocks();
  setSession(true);
});

describe("MemosPage", () => {
  it("로그인하지 않았으면 로그인 화면으로 보낸다", async () => {
    setSession(false);
    serve([]);
    render(<MemosPage />);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("탭은 전체·일반·글·독서 순서이고, 처음에는 전체가 선택돼 있다", async () => {
    serve([general("g", { content: "메모내용" })]);
    render(<MemosPage />);

    await screen.findByText("메모내용");
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.replace(/\d+$/, ""))).toEqual(["전체", "일반", "글", "독서"]);
    expect(tab(/전체/)).toHaveAttribute("aria-selected", "true");
  });

  it("각 탭 이름 옆에 그 종류의 메모 수가 붙는다", async () => {
    serve([general("g1"), general("g2"), onPost("p"), onReading("r")]);
    render(<MemosPage />);

    await screen.findAllByRole("listitem");
    expect(tab(/전체/)).toHaveTextContent("전체4");
    expect(tab(/일반/)).toHaveTextContent("일반2");
    expect(tab(/글/)).toHaveTextContent("글1");
    expect(tab(/독서/)).toHaveTextContent("독서1");
  });

  it("전체 탭은 서버가 준 순서(최근 수정순) 그대로 모든 메모를 카드로 보여준다", async () => {
    serve([general("g", { content: "첫째" }), onPost("p", { content: "둘째" }), onReading("r", { content: "셋째" })]);
    render(<MemosPage />);

    await screen.findByText("첫째");
    expect(cards().map((c) => c.textContent)).toEqual([expect.stringContaining("첫째"), expect.stringContaining("둘째"), expect.stringContaining("셋째")]);
  });

  it("탭을 누르면 그 종류의 메모만 보인다", async () => {
    const user = userEvent.setup();
    serve([general("g", { content: "일반내용" }), onPost("p", { content: "글내용" }), onReading("r", { content: "독서내용" })]);
    render(<MemosPage />);
    await screen.findByText("일반내용");

    await user.click(tab(/글/));
    expect(screen.queryByText("일반내용")).toBeNull();
    expect(screen.getByText("글내용")).toBeInTheDocument();
    expect(tab(/글/)).toHaveAttribute("aria-selected", "true");

    await user.click(tab(/독서/));
    expect(screen.getByText("독서내용")).toBeInTheDocument();
    expect(screen.queryByText("글내용")).toBeNull();

    await user.click(tab(/일반/));
    expect(screen.getByText("일반내용")).toBeInTheDocument();
  });

  it("카드에는 종류 표시·제목·내용·수정 시각이 나온다 (글·독서 메모는 대상 제목도)", async () => {
    serve([onPost("p", { title: "청크 크기", content: "오버랩 비교", targetTitle: "RAG 설계", updatedAt: "2026-11-11T10:20:00.000Z" })]);
    render(<MemosPage />);

    const card = (await screen.findAllByRole("listitem"))[0];
    expect(within(card).getByText("글")).toBeInTheDocument();
    expect(within(card).getByText("청크 크기")).toBeInTheDocument();
    expect(within(card).getByText("오버랩 비교")).toBeInTheDocument();
    expect(within(card).getByText("RAG 설계")).toBeInTheDocument();
    expect(card).toHaveTextContent(/2026/);
  });

  it("카드는 정사각형이고 메모장과 같은 색(메모 색 토큰)을 쓴다", async () => {
    serve([general("g", { content: "내용" })]);
    render(<MemosPage />);

    const link = within((await screen.findAllByRole("listitem"))[0]).getByRole("link");
    expect(link).toHaveClass("aspect-square", "bg-memo", "text-memo-foreground", "border-memo-border");
    // 위쪽 띠(종류·대상)는 메모장 헤더와 같은 색
    expect(within(link).getByText("일반").closest("div")).toHaveClass("bg-memo-header");
  });

  it("제목이 비어 있으면 '제목 없음', 내용이 비어 있으면 '내용 없음'으로 보인다", async () => {
    serve([general("g", { title: "", content: "" })]);
    render(<MemosPage />);

    const card = (await screen.findAllByRole("listitem"))[0];
    expect(within(card).getByText("제목 없음")).toBeInTheDocument();
    expect(within(card).getByText("내용 없음")).toBeInTheDocument();
  });

  it("카드를 누르면 대상으로 이동한다 — 글은 /posts/:id, 독서는 /reading/:id, 일반 메모는 메모장이 그 메모를 열도록 /?memo=:id", async () => {
    serve([onPost("p", { targetId: "p9", content: "글메모" }), onReading("r", { targetId: "r9", content: "독서메모" }), general("g", { content: "일반메모" })]);
    render(<MemosPage />);

    await screen.findByText("글메모");
    const hrefs = cards().map((c) => within(c).getByRole("link").getAttribute("href"));
    expect(hrefs).toEqual(["/posts/p9", "/reading/r9", "/?memo=g"]);
  });

  it("메모가 하나도 없으면 안내 문구를 보여준다", async () => {
    serve([]);
    render(<MemosPage />);

    expect(await screen.findByText("메모가 없어요.")).toBeInTheDocument();
  });

  it("종류별 탭에 메모가 없으면 그 탭에서만 빈 안내를 보여준다", async () => {
    const user = userEvent.setup();
    serve([general("g", { content: "일반내용" })]);
    render(<MemosPage />);
    await screen.findByText("일반내용");

    await user.click(tab(/독서/));

    expect(screen.getByText("메모가 없어요.")).toBeInTheDocument();
    expect(screen.queryByText("일반내용")).toBeNull();
  });

  it("불러오기에 실패하면 안내와 다시 시도 버튼을 보여주고, 누르면 다시 불러온다", async () => {
    const user = userEvent.setup();
    serve([general("g", { content: "복구된 메모" })]);
    // 나중에 등록한 핸들러가 먼저 적용된다 — 첫 요청만 실패시키고 다시 시도하면 위의 정상 응답이 나간다
    server.use(http.get(MEMOS_URL, () => HttpResponse.json({ message: "boom" }, { status: 500 }), { once: true }));
    render(<MemosPage />);

    await user.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구된 메모")).toBeInTheDocument();
  });
});
