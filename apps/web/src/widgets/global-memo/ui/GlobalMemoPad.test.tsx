import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { makePost } from "@/test/fixtures/posts";
import { createTestQueryClient, renderWithQueryClient } from "@/test/render";

let mockPathname = "/";
let mockSession: { data: { user: { id: string } } | null; isPending: boolean } = { data: { user: { id: "u1" } }, isPending: false };

vi.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
vi.mock("@/shared/lib/auth-client", () => ({ useSession: () => mockSession }));

// 메모장 본체는 따로 테스트한다 — 여기서는 어떤 대상으로 몇 번 마운트되는지만 본다
const mounts: string[] = [];
const unmounts: string[] = [];
vi.mock("@/entities/memo", async () => {
  const actual = await vi.importActual<typeof import("@/entities/memo")>("@/entities/memo");
  const { useEffect } = await import("react");
  return {
    ...actual,
    MemoPad: ({ target }: { target: { type: string; id?: string } }) => {
      const label = `${target.type}:${target.id ?? ""}`;
      useEffect(() => {
        mounts.push(label);
        return () => {
          unmounts.push(label);
        };
      }, [label]);
      return <div data-testid="memo-pad">{label}</div>;
    },
  };
});

import GlobalMemoPad from "./GlobalMemoPad";

const POST_URL = (id: string) => `${TEST_API_URL}/api/v1/blog/posts/${id}`;
const pad = () => screen.queryByTestId("memo-pad");

function setPath(path: string) {
  mockPathname = path;
}

// 같은 QueryClient로 다시 그려야 하는 테스트(경로 변경)용 — rerender는 Provider를 같이 넘겨야 한다
function renderWithRerender() {
  const client = createTestQueryClient();
  const ui = () => (
    <QueryClientProvider client={client}>
      <GlobalMemoPad />
    </QueryClientProvider>
  );
  const view = render(ui());
  return { rerender: () => view.rerender(ui()) };
}

// 계약: docs/todo/memo.md 3차 — 어느 화면에서나 메모장 하나, 대상은 경로가 정한다
describe("GlobalMemoPad", () => {
  beforeEach(() => {
    mockSession = { data: { user: { id: "u1" } }, isPending: false };
    mockPathname = "/";
    mounts.length = 0;
    unmounts.length = 0;
  });
  afterEach(() => vi.restoreAllMocks());

  it("로그인하지 않았으면 아무것도 그리지 않는다", () => {
    mockSession = { data: null, isPending: false };
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toBeNull();
  });

  it("세션을 확인하는 중에는 그리지 않는다", () => {
    mockSession = { data: null, isPending: true };
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toBeNull();
  });

  it("홈 같은 일반 화면에서는 일반 메모장이다", () => {
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toHaveTextContent("general:");
  });

  it("독서 상세는 그 독서 기록의 메모장이고, 새 독서 글쓰기는 일반 메모장이다", () => {
    setPath("/reading/r9");
    const first = renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toHaveTextContent("reading:r9");
    first.unmount();

    setPath("/reading/write");
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toHaveTextContent("general:");
  });

  it("관리자 화면과 메모 관리 화면에서는 숨긴다", () => {
    for (const path of ["/admin", "/memos"]) {
      setPath(path);
      const view = renderWithQueryClient(<GlobalMemoPad />);
      expect(pad()).toBeNull();
      view.unmount();
    }
  });

  it("글쓰기 화면(/write/:id)에서는 그리지 않는다 — 그 화면이 자기 상단 바에 메모장을 둔다", () => {
    setPath("/write/p1");
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()).toBeNull();
  });

  describe("글 상세 (/posts/:id)", () => {
    it("내 글이면 그 글의 메모장을 보여준다", async () => {
      setPath("/posts/p1");
      server.use(http.get(POST_URL("p1"), () => HttpResponse.json(makePost("p1", { userId: "u1" }))));
      renderWithQueryClient(<GlobalMemoPad />);

      await waitFor(() => expect(pad()).toHaveTextContent("post:p1"));
    });

    it("글을 불러오는 동안에는 숨긴다 (남의 글일 수 있으므로)", () => {
      setPath("/posts/p1");
      server.use(http.get(POST_URL("p1"), () => new Promise(() => {})));
      renderWithQueryClient(<GlobalMemoPad />);

      expect(pad()).toBeNull();
    });

    it("남의 글이면 숨긴다 (서버가 남의 글에는 메모를 못 만들게 막는다)", async () => {
      setPath("/posts/p2");
      const requested = vi.fn();
      server.use(
        http.get(POST_URL("p2"), () => {
          requested();
          return HttpResponse.json(makePost("p2", { userId: "other" }));
        }),
      );
      renderWithQueryClient(<GlobalMemoPad />);

      await waitFor(() => expect(requested).toHaveBeenCalled());
      expect(pad()).toBeNull();
    });

    it("글을 불러오지 못하면(404 등) 숨긴다", async () => {
      setPath("/posts/nope");
      const requested = vi.fn();
      server.use(
        http.get(POST_URL("nope"), () => {
          requested();
          return HttpResponse.json({ message: "no" }, { status: 404 });
        }),
      );
      renderWithQueryClient(<GlobalMemoPad />);

      await waitFor(() => expect(requested).toHaveBeenCalled());
      expect(pad()).toBeNull();
    });

    it("글을 확인하기 전에는 글 조회를 하지 않는 화면(홈 등)에서 불필요한 요청을 보내지 않는다", () => {
      const requested = vi.fn();
      server.use(http.get(`${TEST_API_URL}/api/v1/blog/posts/:id`, () => {
        requested();
        return HttpResponse.json(makePost("x"));
      }));
      renderWithQueryClient(<GlobalMemoPad />);

      expect(requested).not.toHaveBeenCalled();
    });
  });

  it("경로가 바뀌어 대상이 달라지면 메모장을 새로 마운트한다 (이전 메모는 언마운트로 저장된다)", () => {
    const view = renderWithRerender();
    expect(mounts).toEqual(["general:"]);

    setPath("/reading/r9");
    view.rerender();

    expect(unmounts).toContain("general:");
    expect(mounts).toEqual(["general:", "reading:r9"]);
  });

  it("같은 대상이면(일반 화면끼리 이동) 다시 마운트하지 않는다 — 열어 둔 메모장이 닫히지 않는다", () => {
    const view = renderWithRerender();

    setPath("/my-posts");
    view.rerender();

    expect(mounts).toEqual(["general:"]);
    expect(unmounts).toEqual([]);
  });

  it("버튼은 데스크톱에서만 보인다 (좁은 화면은 도크의 + 메뉴로 연다)", () => {
    renderWithQueryClient(<GlobalMemoPad />);
    expect(pad()!.parentElement).toHaveClass("hidden", "lg:block");
  });
});
