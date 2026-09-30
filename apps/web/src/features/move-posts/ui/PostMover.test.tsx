import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import PostMover from "./PostMover";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));

const cat = (id: string, name: string, parentId: string | null, depth: number, position = 0) => ({
  id,
  userId: "u1",
  name,
  parentId,
  depth,
  position,
  createdAt: "",
  updatedAt: "",
});
const CATEGORIES = [
  cat("c1", "학습", null, 1),
  cat("c2", "백엔드", "c1", 2),
  cat("c3", "일기", null, 1, 1),
];
const post = (id: string, title: string, category: string, extra = {}) => ({
  id,
  title,
  category,
  isPrivate: false,
  publishedAt: "2026-09-01T00:00:00.000Z",
  ...extra,
});
const POSTS = [
  post("p1", "리액트 쿼리", "학습"),
  post("p2", "NestJS 정리", "백엔드"),
  post("p3", "비공개 일기", "일기", { isPrivate: true }),
  post("p4", "쓰다 만 글", "일기", { publishedAt: null }),
  post("p5", "오늘의 일기", "일기"),
];

function mockApis(posts: object[] = POSTS) {
  server.use(
    http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json(CATEGORIES)),
    http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () => HttpResponse.json(posts)),
  );
}

describe("PostMover (글 이동 탭)", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    } as unknown as ReturnType<typeof useSession>);
  });

  it("처음에는 폴더만 접힌 채 보이고, 하위까지 합친 글 수가 붙는다", async () => {
    mockApis();
    renderWithQueryClient(<PostMover />);

    expect(await screen.findByText("학습")).toBeInTheDocument();
    expect(screen.getByText("일기")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // 학습: 자기 1 + 백엔드 1
    expect(screen.getByText("3")).toBeInTheDocument(); // 일기 3
    expect(screen.queryByText("리액트 쿼리")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학습 펼치기" })).toHaveAttribute("aria-expanded", "false");
  });

  it("폴더를 펼치면 그 안의 글과 하위 폴더가 보이고, 접으면 다시 사라진다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);
    await user.click(await screen.findByRole("button", { name: "학습 펼치기" }));

    expect(screen.getByText("리액트 쿼리")).toBeInTheDocument();
    expect(screen.getByText("백엔드")).toBeInTheDocument();
    // 하위 폴더 '백엔드'의 글은 그 폴더를 펼쳐야 보인다
    expect(screen.queryByText("NestJS 정리")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "백엔드 펼치기" }));
    expect(screen.getByText("NestJS 정리")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "학습 접기" }));
    expect(screen.queryByText("리액트 쿼리")).not.toBeInTheDocument();
    expect(screen.queryByText("NestJS 정리")).not.toBeInTheDocument();
  });

  it("글은 상세로 연결되고, 임시저장 글은 이어 쓰기로 연결되며 각각 표시가 붙는다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);
    await user.click(await screen.findByRole("button", { name: "일기 펼치기" }));

    expect(screen.getByRole("link", { name: "비공개 일기" })).toHaveAttribute("href", "/posts/p3");
    expect(screen.getByText("비공개")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "쓰다 만 글" })).toHaveAttribute("href", "/write/p4");
    expect(screen.getByText("임시저장")).toBeInTheDocument();
  });

  it("'모두 펼치기'는 내용이 있는 폴더를 전부 열고, '모두 접기'는 전부 닫는다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);
    await user.click(await screen.findByRole("button", { name: "모두 펼치기" }));

    expect(screen.getByText("리액트 쿼리")).toBeInTheDocument();
    expect(screen.getByText("NestJS 정리")).toBeInTheDocument();
    expect(screen.getByText("비공개 일기")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "모두 접기" }));
    expect(screen.queryByText("리액트 쿼리")).not.toBeInTheDocument();
  });

  it("카테고리 트리에 없는 이름의 글은 '목록에 없는 카테고리' 폴더로 보인다", async () => {
    mockApis([post("p9", "옛 글", "사라진카테고리")]);
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);
    await user.click(await screen.findByRole("button", { name: "사라진카테고리 펼치기" }));

    expect(screen.getByText("목록에 없는 카테고리")).toBeInTheDocument();
    expect(screen.getByText("옛 글")).toBeInTheDocument();
  });

  it("글이 하나도 없으면 안내 문구를 보여준다", async () => {
    mockApis([]);
    renderWithQueryClient(<PostMover />);

    expect(await screen.findByText("아직 옮길 글이 없어요.")).toBeInTheDocument();
  });

  it("내 글 목록을 못 불러오면 안내와 '다시 시도' 버튼을 보여주고, 누르면 다시 요청한다", async () => {
    let calls = 0;
    server.use(
      http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ message: "fail" }, { status: 500 })
          : HttpResponse.json(POSTS);
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);

    expect(await screen.findByText("내 글 목록을 불러오지 못했어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("학습")).toBeInTheDocument();
  });

  it("글마다 이동 손잡이(드래그 핸들)가 있고, 폴더를 접으면 함께 사라진다", async () => {
    mockApis();
    const user = userEvent.setup();
    renderWithQueryClient(<PostMover />);
    await user.click(await screen.findByRole("button", { name: "일기 펼치기" }));

    expect(screen.getByRole("button", { name: "비공개 일기 이동" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "쓰다 만 글 이동" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "일기 접기" }));
    expect(screen.queryByRole("button", { name: "비공개 일기 이동" })).not.toBeInTheDocument();
  });

  it("사용 방법 안내 문구가 보인다", async () => {
    mockApis();
    renderWithQueryClient(<PostMover />);

    expect(await screen.findByText(/손잡이/)).toBeInTheDocument();
  });
});
