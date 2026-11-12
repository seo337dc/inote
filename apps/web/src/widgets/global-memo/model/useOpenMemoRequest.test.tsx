import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOpenMemoRequest } from "./useOpenMemoRequest";

let mockSearch = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockSearch) }));

// renderHook은 effect(id 비우기)까지 끝낸 뒤의 값을 돌려준다 — 렌더마다 값을 기록해 "요청이 실제로 한 번 나갔는지"를 본다
function track() {
  const seen: { seq: number; id?: string }[] = [];
  const hook = renderHook(() => {
    const value = useOpenMemoRequest();
    seen.push(value);
    return value;
  });
  return { ...hook, seen };
}

// "?memo=ID로 들어오면 그 메모를 열어 달라"는 요청을 상태로 바꾼다 — GlobalMemoPad에서 떼어낸 규칙
beforeEach(() => {
  mockSearch = "";
  window.history.replaceState(null, "", "/");
});

describe("useOpenMemoRequest", () => {
  it("memo가 없으면 요청이 없다 (seq 0, id 없음)", () => {
    const { result } = renderHook(() => useOpenMemoRequest());
    expect(result.current).toEqual({ seq: 0 });
  });

  it("처음부터 ?memo=ID로 들어오면 그 id로 요청한다 (seq 1) — 화면에 그려지기 전에 정해진다", () => {
    mockSearch = "memo=g1";
    const { seen } = track();
    // 렌더 중 상태 갱신이라 React가 첫 결과를 버리고 바로 다시 렌더한다 — 마지막 기록이 아니라 요청이 나간 값이 있는지를 본다
    expect(seen).toContainEqual({ seq: 1, id: "g1" });
  });

  it("마운트가 끝나면 id를 비운다 — seq는 그대로라 메모장이 다시 마운트되지 않고, 돌아와도 저절로 열리지 않는다", async () => {
    mockSearch = "memo=g1";
    const { result } = renderHook(() => useOpenMemoRequest());

    await waitFor(() => expect(result.current).toEqual({ seq: 1 }));
  });

  it("나중에 ?memo가 생기면 새 요청이 된다 (seq 증가)", () => {
    const { result, rerender, seen } = track();
    expect(result.current.seq).toBe(0);

    mockSearch = "memo=g1";
    rerender();

    expect(seen).toContainEqual({ seq: 1, id: "g1" });
  });

  it("주소에서 memo가 지워진 뒤 같은 id로 다시 들어와도 새 요청이다", async () => {
    mockSearch = "memo=g1";
    const { result, rerender, seen } = track();
    await waitFor(() => expect(result.current.id).toBeUndefined());

    mockSearch = "";
    rerender();
    mockSearch = "memo=g1";
    rerender();

    expect(seen).toContainEqual({ seq: 2, id: "g1" });
  });

  it("처리하면 주소에서 memo만 지운다 (다른 쿼리는 유지, 새로고침해도 다시 열리지 않게)", async () => {
    window.history.replaceState(null, "", "/?memo=g1&keep=1");
    mockSearch = "memo=g1&keep=1";
    renderHook(() => useOpenMemoRequest());

    await waitFor(() => expect(window.location.search).toBe("?keep=1"));
  });
});
