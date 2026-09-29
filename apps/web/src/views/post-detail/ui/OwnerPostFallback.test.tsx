import { Component, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import OwnerPostFallback from "./OwnerPostFallback";
import { renderWithQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { TEST_API_URL } from "@/test/msw/handlers";
import { useSession } from "@/shared/lib/auth-client";

vi.mock("@/shared/lib/auth-client", () => ({ useSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/shared/ui/page-loading", () => ({ PageLoading: () => <p>로딩 중</p> }));
vi.mock("./PostArticle", () => ({
  default: ({ post }: { post: { title: string } }) => <h1>{post.title}</h1>,
}));

const mockedUseSession = vi.mocked(useSession);

// notFound()가 던지는 에러를 잡아서 "404 화면으로 넘어갔다"를 확인하기 위한 경계
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>404 화면</p> : this.props.children;
  }
}

function setSession(state: "pending" | "none" | "user") {
  mockedUseSession.mockReturnValue({
    data: state === "user" ? { user: { id: "owner" } } : null,
    isPending: state === "pending",
  } as unknown as ReturnType<typeof useSession>);
}

function renderFallback() {
  return renderWithQueryClient(
    <Boundary>
      <OwnerPostFallback id="p1" />
    </Boundary>,
  );
}

describe("OwnerPostFallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("서버에선 404였어도 로그인한 작성자가 브라우저로 조회되면 글을 보여준다", async () => {
    setSession("user");
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts/p1`, () =>
        HttpResponse.json({ id: "p1", title: "내 비공개 글" }),
      ),
    );

    renderFallback();

    expect(await screen.findByText("내 비공개 글")).toBeInTheDocument();
  });

  it("로그인했어도 조회가 404면 404 화면으로 넘긴다 (남의 비공개 글·없는 글)", async () => {
    setSession("user");
    server.use(
      http.get(`${TEST_API_URL}/api/v1/blog/posts/p1`, () =>
        HttpResponse.json({ message: "글을 찾을 수 없습니다." }, { status: 404 }),
      ),
    );

    renderFallback();

    expect(await screen.findByText("404 화면")).toBeInTheDocument();
  });

  it("비로그인이면 요청 없이 바로 404 화면으로 넘긴다", () => {
    setSession("none");

    renderFallback();

    expect(screen.getByText("404 화면")).toBeInTheDocument();
  });

  it("세션 확인 중에는 로딩을 보여준다", () => {
    setSession("pending");

    renderFallback();

    expect(screen.getByText("로딩 중")).toBeInTheDocument();
  });
});
