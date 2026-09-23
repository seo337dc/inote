import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import MarkInoteUsed from "./MarkInoteUsed";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";

vi.mock("@/shared/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/shared/lib/api", () => ({
  api: { patch: vi.fn() },
}));

const mockedUseSession = vi.mocked(useSession);
const mockedApiPatch = vi.mocked(api.patch);

function mockSession(userId: string | null) {
  mockedUseSession.mockReturnValue({
    data: userId ? { user: { id: userId } } : null,
  } as ReturnType<typeof useSession>);
}

describe("MarkInoteUsed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiPatch.mockResolvedValue(undefined);
  });

  it("세션이 없으면 호출하지 않는다", () => {
    mockSession(null);
    render(<MarkInoteUsed />);
    expect(mockedApiPatch).not.toHaveBeenCalled();
  });

  it("세션이 있으면 usesInote를 true로 보고한다", () => {
    mockSession("user-1");
    render(<MarkInoteUsed />);
    expect(mockedApiPatch).toHaveBeenCalledWith("/users/me", { usesInote: true });
    expect(mockedApiPatch).toHaveBeenCalledTimes(1);
  });

  it("같은 유저로 리렌더돼도 재호출하지 않는다", () => {
    mockSession("user-1");
    const { rerender } = render(<MarkInoteUsed />);
    rerender(<MarkInoteUsed />);
    expect(mockedApiPatch).toHaveBeenCalledTimes(1);
  });

  it("다른 유저로 바뀌면 다시 호출한다", () => {
    mockSession("user-1");
    const { rerender } = render(<MarkInoteUsed />);
    mockSession("user-2");
    rerender(<MarkInoteUsed />);
    expect(mockedApiPatch).toHaveBeenCalledTimes(2);
    expect(mockedApiPatch).toHaveBeenLastCalledWith("/users/me", { usesInote: true });
  });
});
