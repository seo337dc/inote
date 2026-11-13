import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import MemosPage from "./MemosPage";
import { renderWithQueryClient as render } from "@/test/render";
import { installFakeIntersectionObserver } from "@/test/intersection-observer";
import { server } from "@/test/msw/server";
import { makeGroupPage, makeMemo, makeMemoGroup, MEMO_GROUPS_URL, MEMOS_URL } from "@/test/fixtures/memo";
import { useSession } from "@/shared/lib/auth-client";
import type { MemoGroup } from "@/entities/memo";

// 메모 관리 — 전체/일반/글/독서 탭, 대상별로 묶은 카드 목록. 계약: docs/todo/memo.md 4차
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

// 메모장 본체는 따로 테스트한다 — 여기서는 어떤 대상·메모로 열리는지, 닫을 때 목록을 다시 불러오는지만 본다
vi.mock("@/entities/memo", async () => {
  const actual = await vi.importActual<typeof import("@/entities/memo")>("@/entities/memo");
  return {
    ...actual,
    MemoPad: ({ target, openMemoId, standalone, onClose }: { target: { type: string; id?: string }; openMemoId?: string; standalone?: boolean; onClose?: () => void }) => (
      <div role="dialog" aria-label="메모장" data-standalone={String(Boolean(standalone))}>
        <span data-testid="pad-target">{`${target.type}:${target.id ?? ""}`}</span>
        <span data-testid="pad-memo">{openMemoId}</span>
        <button type="button" onClick={onClose}>
          메모장 닫기
        </button>
      </div>
    ),
  };
});

function setSession(loggedIn: boolean) {
  vi.mocked(useSession).mockReturnValue({
    data: loggedIn ? { user: { id: "u1" } } : null,
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
}

const general = (id: string, content: string) =>
  makeMemoGroup({ targetType: "general", targetId: "", targetTitle: null, memos: [makeMemo({ id, targetType: "general", targetId: "", content })] });
const post = (id: string, content: string, title = "글 제목") =>
  makeMemoGroup({ targetType: "post", targetId: id, targetTitle: title, memos: [makeMemo({ id: `m-${id}`, targetType: "post", targetId: id, content })] });
const reading = (id: string, content: string) =>
  makeMemoGroup({ targetType: "reading", targetId: id, targetTitle: "책 제목", memos: [makeMemo({ id: `m-${id}`, targetType: "reading", targetId: id, content })] });

// 서버 목: targetType 쿼리에 맞는 그룹만 돌려주고, 받은 요청의 쿼리를 기록한다
function serve(all: MemoGroup[]) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(MEMO_GROUPS_URL, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const type = params.get("targetType");
      return HttpResponse.json(makeGroupPage(type ? all.filter((g) => g.targetType === type) : all));
    }),
  );
  return requests;
}

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

  it("탭은 전체·일반·글·독서 순서이고 처음에는 전체가 선택돼 있다 (탭 숫자는 보이지 않는다)", async () => {
    serve([general("g", "메모내용")]);
    render(<MemosPage />);

    await screen.findByText("메모내용");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["전체", "일반", "글", "독서"]);
    expect(tab("전체")).toHaveAttribute("aria-selected", "true");
  });

  it("전체 탭은 종류 조건 없이 요청하고, 서버가 준 순서대로 그룹을 카드 한 장씩 보여준다", async () => {
    const requests = serve([general("g", "첫째"), post("p1", "둘째"), reading("r1", "셋째")]);
    render(<MemosPage />);

    await screen.findByText("첫째");
    expect(requests[0].has("targetType")).toBe(false);
    expect(cards().map((c) => c.textContent)).toEqual([expect.stringContaining("첫째"), expect.stringContaining("둘째"), expect.stringContaining("셋째")]);
  });

  it("같은 글의 메모 여러 장은 카드 한 장으로 묶여 보인다 (외 N개)", async () => {
    const memos = ["a", "b", "c"].map((id) => makeMemo({ id, targetType: "post", targetId: "p1", content: `내용 ${id}` }));
    serve([makeMemoGroup({ targetType: "post", targetId: "p1", targetTitle: "묶인 글", memos })]);
    render(<MemosPage />);

    await screen.findByText("묶인 글");
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("외 2개")).toBeInTheDocument();
  });

  it("탭을 누르면 그 종류로 다시 요청하고 그 종류의 카드만 보인다", async () => {
    const user = userEvent.setup();
    const requests = serve([general("g", "일반내용"), post("p1", "글내용"), reading("r1", "독서내용")]);
    render(<MemosPage />);
    await screen.findByText("일반내용");

    await user.click(tab("글"));
    expect(await screen.findByText("글내용")).toBeInTheDocument();
    expect(screen.queryByText("일반내용")).toBeNull();
    expect(requests.at(-1)!.get("targetType")).toBe("post");
    expect(tab("글")).toHaveAttribute("aria-selected", "true");

    await user.click(tab("독서"));
    expect(await screen.findByText("독서내용")).toBeInTheDocument();
    expect(requests.at(-1)!.get("targetType")).toBe("reading");

    await user.click(tab("일반"));
    expect(await screen.findByText("일반내용")).toBeInTheDocument();
    expect(requests.at(-1)!.get("targetType")).toBe("general");
  });

  it("메모가 하나도 없으면 안내 문구를 보여준다", async () => {
    serve([]);
    render(<MemosPage />);

    expect(await screen.findByText("메모가 없어요.")).toBeInTheDocument();
  });

  it("종류별 탭에 메모가 없으면 그 탭에서만 빈 안내를 보여준다", async () => {
    const user = userEvent.setup();
    serve([general("g", "일반내용")]);
    render(<MemosPage />);
    await screen.findByText("일반내용");

    await user.click(tab("독서"));

    expect(await screen.findByText("메모가 없어요.")).toBeInTheDocument();
    expect(screen.queryByText("일반내용")).toBeNull();
  });

  it("불러오기에 실패하면 안내와 다시 시도 버튼을 보여주고, 누르면 다시 불러온다", async () => {
    const user = userEvent.setup();
    serve([general("g", "복구된 메모")]);
    // 나중에 등록한 핸들러가 먼저 적용된다 — 첫 요청만 실패시키고 다시 시도하면 위의 정상 응답이 나간다
    server.use(http.get(MEMO_GROUPS_URL, () => HttpResponse.json({ message: "boom" }, { status: 500 }), { once: true }));
    render(<MemosPage />);

    await user.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구된 메모")).toBeInTheDocument();
  });
});

describe("MemosPage — 카드의 메모를 누르면 메모장 열기", () => {
  const manyMemos = () => ["a", "b"].map((id) => makeMemo({ id, targetType: "post", targetId: "p9", title: `메모${id}`, content: `내용${id}` }));
  const postGroup = () => makeMemoGroup({ targetType: "post", targetId: "p9", targetTitle: "묶인 글", memos: manyMemos() });

  it("글 카드를 누르면 그 글을 대상으로, 보이는 메모를 선택한 큰 메모장이 열린다", async () => {
    const user = userEvent.setup();
    serve([postGroup()]);
    render(<MemosPage />);
    await screen.findByText("묶인 글");

    await user.click(screen.getByRole("button", { name: "메모 열기" }));

    expect(screen.getByRole("dialog", { name: "메모장" })).toHaveAttribute("data-standalone", "true");
    expect(screen.getByTestId("pad-target")).toHaveTextContent("post:p9");
    expect(screen.getByTestId("pad-memo")).toHaveTextContent("a");
  });

  it("카드에서 넘겨 둔 메모를 눌러 열면 그 메모가 선택된다", async () => {
    const user = userEvent.setup();
    serve([postGroup()]);
    render(<MemosPage />);
    await screen.findByText("묶인 글");

    await user.click(screen.getByRole("button", { name: "다음 메모" }));
    await user.click(screen.getByRole("button", { name: "메모 열기" }));

    expect(screen.getByTestId("pad-memo")).toHaveTextContent("b");
  });

  it("독서 카드는 독서 기록을, 일반 카드는 대상 없는 일반 메모장을 연다", async () => {
    const user = userEvent.setup();
    serve([reading("r7", "독서내용"), general("g1", "일반내용")]);
    render(<MemosPage />);
    await screen.findByText("독서내용");

    const [readingCard, generalCard] = screen.getAllByRole("listitem");
    await user.click(within(readingCard).getByRole("button", { name: "메모 열기" }));
    expect(screen.getByTestId("pad-target")).toHaveTextContent("reading:r7");
    await user.click(screen.getByRole("button", { name: "메모장 닫기" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(within(generalCard).getByRole("button", { name: "메모 열기" }));
    expect(screen.getByTestId("pad-target")).toHaveTextContent("general:");
    expect(screen.getByTestId("pad-memo")).toHaveTextContent("g1");
  });

  it("메모장을 닫으면 사라지고, 그 대상의 메모만 한 번 받아 고친 내용을 카드에 반영한다 (그룹 목록을 다시 요청하지 않는다)", async () => {
    const user = userEvent.setup();
    let groupRequests = 0;
    const targetRequests: string[] = [];
    server.use(
      http.get(MEMO_GROUPS_URL, () => {
        groupRequests += 1;
        return HttpResponse.json(makeGroupPage([general("g1", "고치기 전")]));
      }),
      // 메모장에서 고친 뒤의 그 대상(일반 메모)의 메모 — 닫을 때 한 번 받는다
      http.get(MEMOS_URL, ({ request }) => {
        targetRequests.push(new URL(request.url).searchParams.toString());
        return HttpResponse.json([makeMemo({ id: "g1", targetType: "general", targetId: "", content: "메모장에서 고침", updatedAt: "2030-01-01T00:00:00Z" })]);
      }),
    );
    render(<MemosPage />);
    await screen.findByText("고치기 전");

    await user.click(screen.getByRole("button", { name: "메모 열기" }));
    await user.click(screen.getByRole("button", { name: "메모장 닫기" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("메모장에서 고침")).toBeInTheDocument();
    expect(targetRequests).toEqual(["targetType=general"]);
    expect(groupRequests).toBe(1);
  });

  it("고친 글 그룹은 목록 맨 앞으로 올라온다", async () => {
    const user = userEvent.setup();
    const older = makeMemo({ id: "m-p1", targetType: "post", targetId: "p1", content: "오래된 글 메모", updatedAt: "2026-11-01T00:00:00Z" });
    serve([
      makeMemoGroup({ targetType: "post", targetId: "p2", targetTitle: "위쪽 글", updatedAt: "2026-11-10T00:00:00Z", memos: [makeMemo({ id: "m-p2", targetType: "post", targetId: "p2", content: "위쪽 메모", updatedAt: "2026-11-10T00:00:00Z" })] }),
      makeMemoGroup({ targetType: "post", targetId: "p1", targetTitle: "아래쪽 글", updatedAt: older.updatedAt, memos: [older] }),
    ]);
    server.use(
      http.get(MEMOS_URL, () => HttpResponse.json([{ ...older, content: "방금 고친 메모", updatedAt: "2030-01-01T00:00:00Z" }])),
    );
    render(<MemosPage />);
    await screen.findByText("아래쪽 글");

    await user.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: "메모 열기" }));
    await user.click(screen.getByRole("button", { name: "메모장 닫기" }));

    await waitFor(() => expect(screen.getAllByRole("listitem")[0].textContent).toContain("방금 고친 메모"));
    expect(screen.getAllByRole("listitem")[1].textContent).toContain("위쪽 메모");
  });

  it("목록은 스크롤 앵커링을 끈다 — 고친 카드가 맨 앞으로 옮겨져도 브라우저가 그 카드를 따라 맨 위로 끌고 가지 않는다", async () => {
    serve([general("g1", "하나")]);
    render(<MemosPage />);
    await screen.findByText("하나");

    expect(screen.getByRole("list")).toHaveClass("[overflow-anchor:none]");
  });

  it("메모장은 한 번에 하나만 열린다 (열려 있는 동안은 같은 화면의 다른 카드가 가려진다)", async () => {
    const user = userEvent.setup();
    serve([general("g1", "하나"), general("g2", "둘")]);
    render(<MemosPage />);
    await screen.findByText("하나");

    await user.click(screen.getAllByRole("button", { name: "메모 열기" })[0]);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});

// 무한 스크롤 — 목록 끝(센티널)이 화면에 들어오면 nextCursor로 다음 페이지를 이어 붙인다
describe("MemosPage — 무한 스크롤", () => {
  let io: ReturnType<typeof installFakeIntersectionObserver>;
  beforeEach(() => {
    io = installFakeIntersectionObserver();
  });
  afterEach(() => vi.unstubAllGlobals());

  // 페이지 3개: cursor 없음 → p1,p2 / c1 → p3,p4 / c2 → p5
  const PAGES: Record<string, ReturnType<typeof makeGroupPage>> = {
    "": makeGroupPage([post("1", "내용1"), post("2", "내용2")], "c1"),
    c1: makeGroupPage([post("3", "내용3"), post("4", "내용4")], "c2"),
    c2: makeGroupPage([post("5", "내용5")], null),
  };
  function servePages(overrides: Partial<Record<string, () => Response | Promise<Response>>> = {}) {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        cursors.push(cursor);
        const override = overrides[cursor ?? ""];
        return override ? override() : HttpResponse.json(PAGES[cursor ?? ""]);
      }),
    );
    return cursors;
  }
  const texts = () => cards().map((c) => c.textContent ?? "");

  it("처음에는 첫 페이지만 보인다", async () => {
    const cursors = servePages();
    render(<MemosPage />);

    await screen.findByText("내용1");
    expect(cards()).toHaveLength(2);
    expect(cursors).toEqual([null]);
  });

  it("목록 끝이 화면에 들어오면 nextCursor로 다음 페이지를 받아 아래에 이어 붙인다", async () => {
    const cursors = servePages();
    render(<MemosPage />);
    await screen.findByText("내용1");

    await io.show(true);

    await screen.findByText("내용3");
    expect(cursors).toEqual([null, "c1"]);
    expect(texts().map((t) => t.replace(/\D/g, ""))).toEqual(expect.arrayContaining([expect.stringContaining("1"), expect.stringContaining("3")]));
    expect(cards()).toHaveLength(4);
  });

  it("끝까지 이어 받으면 더 요청하지 않고 '모든 메모를 확인했어요'를 보여준다", async () => {
    const cursors = servePages();
    render(<MemosPage />);
    await screen.findByText("내용1");

    await io.show(true);
    await screen.findByText("내용3");
    await io.show(true);
    await screen.findByText("내용5");

    expect(cards()).toHaveLength(5);
    expect(screen.getByText("모든 메모를 확인했어요.")).toBeInTheDocument();
    expect(cursors).toEqual([null, "c1", "c2"]);
    expect(io.live()).toHaveLength(0); // 더 볼 게 없으니 관찰도 멈춘다
  });

  it("첫 페이지가 마지막이면 끝 안내만 보이고 다음 페이지를 요청하지 않는다", async () => {
    server.use(http.get(MEMO_GROUPS_URL, () => HttpResponse.json(makeGroupPage([post("1", "내용1")], null))));
    render(<MemosPage />);

    expect(await screen.findByText("모든 메모를 확인했어요.")).toBeInTheDocument();
    expect(io.live()).toHaveLength(0);
  });

  it("다음 페이지를 불러오는 동안 '불러오는 중'을 보여준다", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    servePages({ c1: async () => (await gate, HttpResponse.json(PAGES.c1)) });
    render(<MemosPage />);
    await screen.findByText("내용1");

    await io.show(true);

    expect(await screen.findByRole("status")).toHaveTextContent("불러오는 중");
    release();
    await screen.findByText("내용3");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("불러오는 중에 끝이 또 보여도 같은 페이지를 중복 요청하지 않는다 (관찰을 멈춘다)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const cursors = servePages({ c1: async () => (await gate, HttpResponse.json(PAGES.c1)) });
    render(<MemosPage />);
    await screen.findByText("내용1");
    await io.show(true);
    await screen.findByRole("status");

    expect(io.live()).toHaveLength(0);
    release();
    await screen.findByText("내용3");
    expect(cursors.filter((c) => c === "c1")).toHaveLength(1);
  });

  it("목록 끝을 미리(화면에 닿기 전에) 감지하도록 여유를 둔다", async () => {
    servePages();
    render(<MemosPage />);
    await screen.findByText("내용1");

    expect(io.live()[0].options?.rootMargin).toMatch(/^\d+px$/);
  });

  it("다음 페이지를 받지 못하면 안내와 다시 시도 버튼을 보이고, 자동으로 다시 요청하지 않는다", async () => {
    const cursors = servePages({ c1: () => HttpResponse.json({ message: "boom" }, { status: 500 }) });
    render(<MemosPage />);
    await screen.findByText("내용1");

    await io.show(true);

    expect(await screen.findByText("더 불러오지 못했어요.")).toBeInTheDocument();
    expect(screen.getByText("내용1")).toBeInTheDocument(); // 이미 받은 카드는 그대로
    expect(io.live()).toHaveLength(0);
    expect(cursors.filter((c) => c === "c1")).toHaveLength(1);
  });

  it("다음 페이지 실패 뒤 '다시 시도'를 누르면 그 페이지를 다시 받아 이어 붙인다", async () => {
    const user = userEvent.setup();
    let fail = true;
    servePages({ c1: () => (fail ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json(PAGES.c1)) });
    render(<MemosPage />);
    await screen.findByText("내용1");
    await io.show(true);
    await screen.findByText("더 불러오지 못했어요.");

    fail = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("내용3")).toBeInTheDocument();
    expect(screen.queryByText("더 불러오지 못했어요.")).toBeNull();
  });

  it("탭을 바꾸면 처음(cursor 없음)부터 다시 불러오고 이전 탭에서 이어 붙인 카드는 사라진다", async () => {
    const user = userEvent.setup();
    const requests: { type: string | null; cursor: string | null }[] = [];
    server.use(
      http.get(MEMO_GROUPS_URL, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push({ type: params.get("targetType"), cursor: params.get("cursor") });
        const cursor = params.get("cursor") ?? "";
        if (params.get("targetType") === "general") return HttpResponse.json(makeGroupPage([general("g1", "일반내용")], null));
        return HttpResponse.json(PAGES[cursor]);
      }),
    );
    render(<MemosPage />);
    await screen.findByText("내용1");
    await io.show(true);
    await screen.findByText("내용3");

    await user.click(tab("일반"));

    expect(await screen.findByText("일반내용")).toBeInTheDocument();
    expect(screen.queryByText("내용3")).toBeNull();
    expect(requests.at(-1)).toEqual({ type: "general", cursor: null });
  });
});

