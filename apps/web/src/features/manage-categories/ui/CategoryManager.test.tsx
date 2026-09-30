import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import CategoryManager from "./CategoryManager";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePostListPage } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";
import { toast } from "sonner";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const cat = (id: string, name: string, parentId: string | null, depth: number) => ({
  id,
  userId: "u1",
  name,
  parentId,
  depth,
  position: 0,
  createdAt: "",
  updatedAt: "",
});

// 학습 > 백엔드 > NestJS (3단계), 이직
const CATEGORIES = [
  cat("c1", "학습", null, 1),
  cat("c2", "백엔드", "c1", 2),
  cat("c3", "NestJS", "c2", 3),
  cat("c4", "이직", null, 1),
];

function mockApis(categories = CATEGORIES, counts: Record<string, number> = {}) {
  server.use(
    http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json(categories)),
    http.get(`${TEST_API_URL}/api/v1/blog/posts/mine`, () =>
      HttpResponse.json({ ...makePostListPage(), categoryCounts: counts }),
    ),
    http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () => HttpResponse.json([])),
  );
}

describe("CategoryManager", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  });

  it("카테고리를 계층 순서대로 보여주고, 하위 카테고리 글까지 합친 글 수를 붙인다", async () => {
    mockApis(CATEGORIES, { 학습: 2, 백엔드: 3, NestJS: 1, 이직: 9 });
    renderWithQueryClient(<CategoryManager />);

    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("학습");
    expect(await screen.findByText("6")).toBeInTheDocument(); // 학습 2 + 백엔드 3 + NestJS 1
    expect(screen.getByText("4")).toBeInTheDocument(); // 백엔드 3 + NestJS 1
    expect(screen.getByText("9")).toBeInTheDocument(); // 이직
  });

  it("3단계(최대 깊이) 카테고리에는 하위 추가 버튼이 없다", async () => {
    mockApis();
    renderWithQueryClient(<CategoryManager />);

    expect(await screen.findByRole("button", { name: "학습의 하위 카테고리 추가" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "백엔드의 하위 카테고리 추가" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NestJS의 하위 카테고리 추가" })).not.toBeInTheDocument();
  });

  it("최상위 카테고리를 입력해 추가하면 이름이 서버로 전송된다", async () => {
    mockApis();
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/categories`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(cat("c9", "독서", null, 1));
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("학습");

    await user.type(screen.getByRole("textbox", { name: "새 최상위 카테고리 이름" }), "  독서 ");
    await user.click(screen.getAllByRole("button", { name: "추가" })[0]);

    await waitFor(() => expect(body).toEqual({ name: "독서" }));
  });

  it("이름이 비어 있으면 추가 버튼이 눌리지 않는다", async () => {
    mockApis();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("학습");

    expect(screen.getAllByRole("button", { name: "추가" })[0]).toBeDisabled();
  });

  it("하위 카테고리 추가: 그 줄 아래에 입력창이 열리고, 부모 id와 함께 전송한 뒤 닫힌다", async () => {
    mockApis();
    let body: unknown;
    server.use(
      http.post(`${TEST_API_URL}/api/v1/categories`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(cat("c9", "프론트", "c1", 2));
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);

    await user.click(await screen.findByRole("button", { name: "학습의 하위 카테고리 추가" }));
    await user.type(screen.getByRole("textbox", { name: "하위 카테고리 이름" }), "프론트");
    await user.click(screen.getAllByRole("button", { name: "추가" })[1]);

    await waitFor(() => expect(body).toEqual({ name: "프론트", parentId: "c1" }));
    expect(screen.queryByRole("textbox", { name: "하위 카테고리 이름" })).not.toBeInTheDocument();
  });

  it("같은 버튼을 다시 누르면(취소) 하위 입력창이 닫힌다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);

    await user.click(await screen.findByRole("button", { name: "학습의 하위 카테고리 추가" }));
    expect(screen.getByRole("textbox", { name: "하위 카테고리 이름" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "학습 하위 카테고리 추가 취소" }));
    expect(screen.queryByRole("textbox", { name: "하위 카테고리 이름" })).not.toBeInTheDocument();
  });

  it("추가에 실패하면 안내 문구를 보여준다", async () => {
    mockApis();
    server.use(
      http.post(`${TEST_API_URL}/api/v1/categories`, () =>
        HttpResponse.json({ message: "fail" }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("학습");

    await user.type(screen.getByRole("textbox", { name: "새 최상위 카테고리 이름" }), "독서");
    await user.click(screen.getAllByRole("button", { name: "추가" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("추가하지 못했어요");
  });

  it("카테고리가 하나도 없으면 안내 문구를 보여준다", async () => {
    mockApis([]);
    renderWithQueryClient(<CategoryManager />);

    expect(await screen.findByText(/아직 카테고리가 없어요/)).toBeInTheDocument();
  });

  it("모든 카테고리 줄에 이동 손잡이가 있다 (3단계 포함)", async () => {
    mockApis();
    renderWithQueryClient(<CategoryManager />);

    for (const name of ["학습", "백엔드", "NestJS", "이직"]) {
      expect(await screen.findByRole("button", { name: `${name} 이동` })).toBeInTheDocument();
    }
  });
});

describe("CategoryManager: 폴더 접기/펼치기 (+ / −)", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  });

  it("처음에는 모든 폴더가 펼쳐져 있고, 하위가 있는 폴더에만 접기 버튼이 있다", async () => {
    mockApis();
    renderWithQueryClient(<CategoryManager />);

    expect(await screen.findByText("NestJS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습 접기" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "백엔드 접기" })).toBeInTheDocument();
    // 하위가 없는 폴더(NestJS, 이직)에는 접기/펼치기 버튼이 없다
    expect(screen.queryByRole("button", { name: /^NestJS (접기|펼치기)$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^이직 (접기|펼치기)$/ })).not.toBeInTheDocument();
  });

  it("접으면 하위 폴더가 모두 숨겨지고 버튼이 '펼치기'(+)로 바뀐다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("NestJS");

    await user.click(screen.getByRole("button", { name: "학습 접기" }));

    expect(screen.queryByText("백엔드")).not.toBeInTheDocument();
    expect(screen.queryByText("NestJS")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습 펼치기" })).toHaveAttribute("aria-expanded", "false");
    // 다른 폴더는 그대로 보인다
    expect(screen.getByText("이직")).toBeInTheDocument();
  });

  it("접힌 폴더의 글 수는 하위까지 합친 값 그대로 보인다", async () => {
    mockApis(CATEGORIES, { 학습: 2, 백엔드: 3, NestJS: 1, 이직: 9 });
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("6");

    await user.click(screen.getByRole("button", { name: "학습 접기" }));

    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("다시 펼치면 하위가 돌아오고, 하위 폴더가 접혀 있었다면 그 상태를 기억한다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("NestJS");

    await user.click(screen.getByRole("button", { name: "백엔드 접기" }));
    expect(screen.queryByText("NestJS")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "학습 접기" }));
    await user.click(screen.getByRole("button", { name: "학습 펼치기" }));

    expect(screen.getByText("백엔드")).toBeInTheDocument();
    expect(screen.queryByText("NestJS")).not.toBeInTheDocument(); // 백엔드는 여전히 접혀 있음
    expect(screen.getByRole("button", { name: "백엔드 펼치기" })).toBeInTheDocument();
  });

  it("접힌 폴더의 '하위 추가'를 누르면 먼저 펼쳐서 기존 하위와 입력 줄이 함께 보인다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await screen.findByText("NestJS");
    await user.click(screen.getByRole("button", { name: "학습 접기" }));

    await user.click(screen.getByRole("button", { name: "학습의 하위 카테고리 추가" }));

    expect(screen.getByRole("textbox", { name: "하위 카테고리 이름" })).toBeInTheDocument();
    expect(screen.getByText("백엔드")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습 접기" })).toBeInTheDocument();
  });
});

describe("CategoryManager: 이름 수정", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  });

  function captureRename(id: string) {
    const captured: { body?: unknown; count: number } = { count: 0 };
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/${id}`, async ({ request }) => {
        captured.body = await request.json();
        captured.count += 1;
        await delay(300); // 응답이 늦어도 화면은 먼저 바뀌어 있어야 한다
        return HttpResponse.json(cat(id, "x", null, 1));
      }),
    );
    return captured;
  }

  async function openEditor(name: string) {
    const user = userEvent.setup();
    renderWithQueryClient(<CategoryManager />);
    await user.click(await screen.findByRole("button", { name: `${name} 이름 수정` }));
    return { user, input: screen.getByRole("textbox", { name: `${name} 새 이름` }) };
  }

  it("연필 버튼을 누르면 그 자리에서 현재 이름이 채워진 입력창이 열린다", async () => {
    mockApis();
    const { input } = await openEditor("이직");

    expect(input).toHaveValue("이직");
    expect(input).toHaveFocus();
  });

  it("이름을 바꿔 Enter를 누르면 화면에서 즉시 새 이름이 되고, 서버에 새 이름을 보낸다", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "커리어{Enter}");

    expect(screen.getByText("커리어")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /새 이름/ })).not.toBeInTheDocument();
    await waitFor(() => expect(captured.body).toEqual({ name: "커리어" }));
  });

  it("앞뒤 공백은 지우고 저장한다", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "  커리어  {Enter}");

    await waitFor(() => expect(captured.body).toEqual({ name: "커리어" }));
  });

  it("Esc를 누르면 저장하지 않고 원래 이름으로 돌아간다 (입력창을 벗어나도 저장되지 않음)", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "취소할이름{Escape}");

    expect(screen.getByText("이직")).toBeInTheDocument();
    expect(screen.queryByText("취소할이름")).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(captured.count).toBe(0);
  });

  it("이름을 그대로 두고 Enter를 누르면 요청 없이 닫힌다", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user } = await openEditor("이직");

    await user.keyboard("{Enter}");

    expect(screen.queryByRole("textbox", { name: /새 이름/ })).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(captured.count).toBe(0);
  });

  it("다른 카테고리와 같은 이름이면 오류 문구를 보여주고 입력창을 유지하며 요청하지 않는다", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "학습{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("이미 있는 카테고리 이름");
    expect(screen.getByRole("textbox", { name: "이직 새 이름" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(captured.count).toBe(0);
  });

  it("50자를 넘는 이름은 오류 문구를 보여주고 요청하지 않는다", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "가".repeat(51) + "{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("50자");
    await new Promise((r) => setTimeout(r, 50));
    expect(captured.count).toBe(0);
  });

  it("오류 문구가 떠 있다가 다시 입력하면 문구가 사라진다", async () => {
    mockApis();
    const { user, input } = await openEditor("이직");
    await user.clear(input);
    await user.type(input, "학습{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "이직 새 이름" }), "2");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("서버가 실패하면 원래 이름으로 되돌리고 안내 토스트를 띄운다", async () => {
    mockApis();
    server.use(
      http.patch(`${TEST_API_URL}/api/v1/categories/c4`, () =>
        HttpResponse.json({ message: "fail" }, { status: 400 }),
      ),
    );
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "커리어{Enter}");

    await waitFor(() => expect(screen.getByText("이직")).toBeInTheDocument());
    expect(screen.queryByText("커리어")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });

  it("Enter로 저장해도 요청은 한 번만 나간다 (이어서 생기는 blur가 다시 저장하지 않음)", async () => {
    mockApis();
    const captured = captureRename("c4");
    const { user, input } = await openEditor("이직");

    await user.clear(input);
    await user.type(input, "커리어{Enter}");
    await new Promise((r) => setTimeout(r, 100));

    expect(captured.count).toBe(1);
  });
});
