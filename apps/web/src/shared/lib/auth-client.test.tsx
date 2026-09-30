import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";

// better-auth 클라이언트가 돌려주는 세션. 서버 렌더링 때는 "로그인 정보 없음",
// 브라우저가 hydration할 즈음에는 그 사이 도착한 "실제 세션"인 상황을 흉내내려고 값을 바꿔 쓴다.
const NO_SESSION = { data: null, isPending: false };
const REAL_SESSION = { data: { user: { id: "u1", name: "서동찬" } }, isPending: false };
let currentSession: typeof NO_SESSION | typeof REAL_SESSION = REAL_SESSION;
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => currentSession,
    signIn: {},
    signUp: {},
    signOut: () => undefined,
  }),
}));
vi.mock("better-auth/client/plugins", () => ({ inferAdditionalFields: () => ({}) }));

import { useSession } from "./auth-client";

function Probe() {
  const { data, isPending } = useSession();
  return <p>{isPending ? "로딩 중" : (data?.user.name ?? "게스트")}</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
  currentSession = REAL_SESSION;
});

describe("useSession (hydration 안전)", () => {
  it("서버 렌더링에서는 세션이 있어도 '로딩 중, 로그인 정보 없음'을 돌려준다", () => {
    currentSession = REAL_SESSION;

    expect(renderToString(<Probe />)).toContain("로딩 중");
    expect(renderToString(<Probe />)).not.toContain("서동찬");
  });

  it("브라우저에서 그리면 실제 세션을 돌려준다", () => {
    render(<Probe />);

    expect(screen.getByText("서동찬")).toBeInTheDocument();
  });

  it("서버 HTML 위에 hydration해도 불일치 에러가 없고, 끝난 뒤 실제 세션으로 바뀐다", async () => {
    // React 19는 hydration 불일치를 console.error가 아니라 onRecoverableError로 알린다
    const onRecoverableError = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    currentSession = NO_SESSION; // 서버는 로그인 정보를 모른 채 HTML을 만든다
    container.innerHTML = renderToString(<Probe />);
    currentSession = REAL_SESSION; // 브라우저가 hydration할 때는 세션이 이미 도착해 있다

    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe("서동찬");
    container.remove();
  });
});
