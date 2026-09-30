import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import CategoryManager from "./CategoryManager";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePostListPage } from "@/test/fixtures/posts";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

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
