import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemo, deleteMemo, getAllMemos, getMemos, updateMemo } from "./memos";
import { MOCK_MEMOS, resetMockMemos } from "../model/mock";

// NEXT_PUBLIC_MEMOS_MOCK=true — 서버 없이 UI를 확인하려고 메모 API를 메모리 안에서 흉내 낸다.
// 메모장(대상별 조회·저장)과 메모 관리(전체 조회)가 같은 저장소를 봐서 서로 반영된다.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK", "true");
  resetMockMemos();
});
afterEach(() => vi.unstubAllEnvs());

describe("메모 API 목 모드", () => {
  it("전체 조회는 목 데이터를 최근 수정순으로 돌려준다", async () => {
    const all = await getAllMemos();

    expect(all).toHaveLength(MOCK_MEMOS.length);
    const times = all.map((m) => m.updatedAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("대상별 조회는 그 대상의 메모만, 만든 순서(오래된 것부터)로 돌려준다", async () => {
    const general = await getMemos({ type: "general" });

    expect(general.length).toBeGreaterThan(0);
    expect(general.every((m) => m.targetType === "general")).toBe(true);
    const created = general.map((m) => m.createdAt);
    expect([...created].sort()).toEqual(created);
  });

  it("만든 메모는 대상별 조회와 전체 조회 모두에 나타나고, 전체 조회에서는 맨 위다", async () => {
    const created = await createMemo({ type: "general" }, { title: "새 메모", content: "내용" });

    expect((await getMemos({ type: "general" })).map((m) => m.id)).toContain(created.id);
    expect((await getAllMemos())[0].id).toBe(created.id);
    expect(created).toMatchObject({ targetType: "general", targetId: "", title: "새 메모", content: "내용" });
  });

  it("수정하면 내용이 바뀌고 전체 조회에서 맨 위로 온다", async () => {
    const updated = await updateMemo("mm5", { content: "고친 내용" });

    expect(updated.content).toBe("고친 내용");
    expect((await getAllMemos())[0]).toMatchObject({ id: "mm5", content: "고친 내용" });
  });

  it("지우면 두 조회 모두에서 사라진다", async () => {
    await deleteMemo("mm1");

    expect((await getAllMemos()).some((m) => m.id === "mm1")).toBe(false);
    expect((await getMemos({ type: "general" })).some((m) => m.id === "mm1")).toBe(false);
  });

  it("일반 메모가 10장이면 더 만들 수 없다 (409)", async () => {
    const have = (await getMemos({ type: "general" })).length;
    for (let i = have; i < 10; i++) await createMemo({ type: "general" }, {});

    await expect(createMemo({ type: "general" }, {})).rejects.toMatchObject({ status: 409 });
  });

  it("resetMockMemos는 저장소를 처음 상태로 되돌린다", async () => {
    await deleteMemo("mm1");
    resetMockMemos();

    expect(await getAllMemos()).toHaveLength(MOCK_MEMOS.length);
  });

  it("목 모드가 아니면 서버로 요청한다 (이 테스트는 서버가 없어 실패해야 한다)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK", "false");
    await expect(getAllMemos()).rejects.toBeDefined();
  });
});
