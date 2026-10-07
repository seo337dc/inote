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

  describe("폴더 추가", () => {
    // POST /categories 요청 본문을 모아 두고, 새로 만든 카테고리를 이후 GET /categories에도 보이게 한다
    function mockCreate(initial = CATEGORIES) {
      const created: { name: string; parentId?: string }[] = [];
      const list = [...initial];
      server.use(
        http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json(list)),
        http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () => HttpResponse.json(POSTS)),
        http.post(`${TEST_API_URL}/api/v1/categories`, async ({ request }) => {
          const body = (await request.json()) as { name: string; parentId?: string };
          created.push(body);
          const parent = list.find((c) => c.id === body.parentId);
          const made = cat(`n${created.length}`, body.name, body.parentId ?? null, (parent?.depth ?? 0) + 1, 9);
          list.push(made);
          return HttpResponse.json(made);
        }),
      );
      return created;
    }

    it("목록 위 입력창으로 최상위 폴더를 추가하면 요청이 가고, 새 폴더가 목록에 나타난다", async () => {
      const created = mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");

      await user.type(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" }), "  이직  ");
      await user.click(screen.getByRole("button", { name: "추가" }));

      expect(await screen.findByText("이직")).toBeInTheDocument();
      expect(created).toEqual([{ name: "이직" }]); // 앞뒤 공백은 지우고, parentId는 보내지 않는다
      expect(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" })).toHaveValue("");
    });

    it("이름이 비어 있으면 추가 버튼이 눌리지 않는다", async () => {
      mockCreate();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");

      expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
    });

    it("이미 있는 이름(다른 단계의 폴더 포함)이면 요청을 보내지 않고 안내한다", async () => {
      const created = mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");

      await user.type(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" }), "백엔드");
      await user.click(screen.getByRole("button", { name: "추가" }));

      expect(screen.getByRole("alert")).toHaveTextContent("이미 있는 이름");
      expect(created).toEqual([]);
      // 입력값은 그대로 두어 고쳐 쓸 수 있고, 다시 입력하면 안내가 사라진다
      expect(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" })).toHaveValue("백엔드");
      await user.type(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" }), "2");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("50자를 넘는 이름은 요청을 보내지 않고 안내한다", async () => {
      const created = mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");

      await user.type(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" }), "가".repeat(51));
      await user.click(screen.getByRole("button", { name: "추가" }));

      expect(screen.getByRole("alert")).toHaveTextContent("50자");
      expect(created).toEqual([]);
    });

    it("폴더 줄의 '하위 추가'를 누르면 그 폴더 아래에 입력줄이 열리고, 추가하면 parentId와 함께 요청된다", async () => {
      const created = mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await user.click(await screen.findByRole("button", { name: "학습의 하위 폴더 추가" }));

      await user.type(screen.getByRole("textbox", { name: "하위 폴더 이름" }), "프론트엔드");
      await user.click(screen.getAllByRole("button", { name: "추가" })[1]); // [0]은 위쪽 최상위 추가 버튼

      // 부모(학습)가 펼쳐져 새 하위 폴더가 보이고, 입력줄은 닫힌다
      expect(await screen.findByText("프론트엔드")).toBeInTheDocument();
      expect(created).toEqual([{ name: "프론트엔드", parentId: "c1" }]);
      expect(screen.queryByRole("textbox", { name: "하위 폴더 이름" })).not.toBeInTheDocument();
    });

    it("하위 폴더 이름이 겹치면 그 입력줄 아래에서 안내하고 요청하지 않는다", async () => {
      const created = mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await user.click(await screen.findByRole("button", { name: "일기의 하위 폴더 추가" }));

      await user.type(screen.getByRole("textbox", { name: "하위 폴더 이름" }), "학습");
      await user.click(screen.getAllByRole("button", { name: "추가" })[1]);

      expect(screen.getByRole("alert")).toHaveTextContent("이미 있는 이름");
      expect(created).toEqual([]);
      expect(screen.getByRole("textbox", { name: "하위 폴더 이름" })).toBeInTheDocument(); // 입력줄은 열려 있다
    });

    it("같은 버튼을 다시 누르면(취소) 입력줄이 닫히고, 다른 폴더의 '하위 추가'를 누르면 그쪽으로 옮겨 간다", async () => {
      mockCreate();
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await user.click(await screen.findByRole("button", { name: "학습의 하위 폴더 추가" }));
      expect(screen.getAllByRole("textbox", { name: "하위 폴더 이름" })).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "일기의 하위 폴더 추가" }));
      expect(screen.getByPlaceholderText("일기의 하위 폴더 이름")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("학습의 하위 폴더 이름")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "일기 하위 폴더 추가 취소" }));
      expect(screen.queryByRole("textbox", { name: "하위 폴더 이름" })).not.toBeInTheDocument();
    });

    it("3단계 폴더에는 '하위 추가'가 없고, 1·2단계에는 있다", async () => {
      mockCreate([...CATEGORIES, cat("c4", "NestJS", "c2", 3)]);
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");
      await user.click(screen.getByRole("button", { name: "모두 펼치기" }));

      expect(screen.getByRole("button", { name: "학습의 하위 폴더 추가" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "백엔드의 하위 폴더 추가" })).toBeInTheDocument();
      expect(screen.getByText("NestJS")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "NestJS의 하위 폴더 추가" })).not.toBeInTheDocument();
    });

    it("카테고리 트리에 없는 이름의 폴더('목록에 없는 카테고리')에는 '하위 추가'가 없다", async () => {
      server.use(
        http.get(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json(CATEGORIES)),
        http.get(`${TEST_API_URL}/api/v1/blog/posts/mine/outline`, () =>
          HttpResponse.json([post("p9", "옛 글", "사라진카테고리")]),
        ),
      );
      renderWithQueryClient(<PostMover />);
      await screen.findByText("사라진카테고리");

      expect(screen.queryByRole("button", { name: "사라진카테고리의 하위 폴더 추가" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "학습의 하위 폴더 추가" })).toBeInTheDocument();
    });

    it("서버가 추가에 실패하면 오류 문구를 보여준다", async () => {
      mockApis();
      server.use(http.post(`${TEST_API_URL}/api/v1/categories`, () => HttpResponse.json({}, { status: 500 })));
      const user = userEvent.setup();
      renderWithQueryClient(<PostMover />);
      await screen.findByText("학습");

      await user.type(screen.getByRole("textbox", { name: "새 최상위 폴더 이름" }), "이직");
      await user.click(screen.getByRole("button", { name: "추가" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("폴더를 추가하지 못했어요");
    });
  });
});
