import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemo, deleteMemo, getMemoGroups, getMemos, updateMemo } from "./memos";
import { MOCK_MEMOS, resetMockMemos } from "../model/mock";

// NEXT_PUBLIC_MEMOS_MOCK=true — 서버 없이 UI를 확인하려고 메모 API를 메모리 안에서 흉내 낸다.
// 메모장(대상별 조회·저장)과 메모 관리(전체 조회)가 같은 저장소를 봐서 서로 반영된다.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK", "true");
  resetMockMemos();
});
afterEach(() => vi.unstubAllEnvs());

describe("메모 API 목 모드", () => {
  it("그룹 조회는 글·독서는 대상 하나를 한 그룹으로, 일반 메모는 한 장씩 한 그룹으로 묶는다", async () => {
    const { items } = await getMemoGroups();

    const keys = items.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const g of items.filter((g) => g.targetType === "general")) expect(g.memos).toHaveLength(1);
    // 목 데이터에는 같은 글에 메모가 여러 장인 그룹이 있다 (묶기 화면 확인용)
    expect(items.some((g) => g.targetType !== "general" && g.memos.length > 1)).toBe(true);
    // 그룹 안 메모는 최근 수정순이고, 그룹 updatedAt은 그 첫 메모의 것
    for (const g of items) {
      const times = g.memos.map((m) => m.updatedAt);
      expect([...times].sort().reverse()).toEqual(times);
      expect(g.updatedAt).toBe(times[0]);
    }
  });

  it("그룹은 최근 수정한 그룹이 위로, 같은 종류만 걸러 볼 수 있다", async () => {
    const { items } = await getMemoGroups();
    const times = items.map((g) => g.updatedAt);
    expect([...times].sort().reverse()).toEqual(times);

    const posts = await getMemoGroups({ targetType: "post" });
    expect(posts.items.length).toBeGreaterThan(0);
    expect(posts.items.every((g) => g.targetType === "post")).toBe(true);
  });

  it("limit만큼 잘라 주고 nextCursor로 이어 받으면 빠짐·중복 없이 전부 받는다 (마지막 페이지의 nextCursor는 null)", async () => {
    const all = (await getMemoGroups()).items.map((g) => g.key);
    const collected: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await getMemoGroups({ limit: 2, cursor });
      expect(page.items.length).toBeLessThanOrEqual(2);
      collected.push(...page.items.map((g) => g.key));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < 50);

    expect(collected).toEqual(all);
    expect(pages).toBeGreaterThan(1);
  });

  it("글·독서 그룹의 targetTitle은 목 데이터의 대상 제목이고, 일반 그룹은 null이다", async () => {
    const { items } = await getMemoGroups();
    expect(items.filter((g) => g.targetType === "general").every((g) => g.targetTitle === null)).toBe(true);
    expect(items.filter((g) => g.targetType !== "general").every((g) => typeof g.targetTitle === "string")).toBe(true);
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
    expect((await getMemoGroups()).items[0].memos[0].id).toBe(created.id);
    expect(created).toMatchObject({ targetType: "general", targetId: "", title: "새 메모", content: "내용" });
  });

  it("수정하면 내용이 바뀌고 전체 조회에서 맨 위로 온다", async () => {
    const updated = await updateMemo("mm5", { content: "고친 내용" });

    expect(updated.content).toBe("고친 내용");
    const top = (await getMemoGroups()).items[0];
    expect(top.memos[0]).toMatchObject({ id: "mm5", content: "고친 내용" });
  });

  it("지우면 두 조회 모두에서 사라진다", async () => {
    await deleteMemo("mm1");

    expect((await getMemoGroups()).items.some((g) => g.memos.some((m) => m.id === "mm1"))).toBe(false);
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

    const total = (await getMemoGroups()).items.reduce((n, g) => n + g.memos.length, 0);
    expect(total).toBe(MOCK_MEMOS.length);
  });

  it("마지막 메모를 지우면 그 그룹이 사라진다", async () => {
    const before = (await getMemoGroups()).items.find((g) => g.key === "mm1")!;
    expect(before.memos).toHaveLength(1);
    await deleteMemo("mm1");

    expect((await getMemoGroups()).items.some((g) => g.key === "mm1")).toBe(false);
  });

  it("같은 대상의 메모를 고치면 그 그룹이 맨 위로 오고 그 메모가 그룹의 첫 메모가 된다", async () => {
    const group = (await getMemoGroups({ targetType: "post" })).items.find((g) => g.memos.length > 1)!;
    const oldest = group.memos[group.memos.length - 1];
    await updateMemo(oldest.id, { content: "방금 고침" });

    const top = (await getMemoGroups()).items[0];
    expect(top.key).toBe(group.key);
    expect(top.memos[0].id).toBe(oldest.id);
  });
});

// 무한 스크롤·성능 확인용 — NEXT_PUBLIC_MEMOS_MOCK_EXTRA=1000 이면 일반 메모 1000개를 더 만든다
describe("대량 목 데이터 (NEXT_PUBLIC_MEMOS_MOCK_EXTRA)", () => {
  async function allGroups(limit = 50) {
    const items: Awaited<ReturnType<typeof getMemoGroups>>["items"] = [];
    let cursor: string | undefined;
    do {
      const page = await getMemoGroups({ limit, cursor });
      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return items;
  }

  it("설정하지 않으면 기본 목 데이터만 있다", async () => {
    expect((await allGroups()).length).toBeLessThan(20);
  });

  it("개수를 주면 일반 메모가 그만큼 더 만들어져 일반 그룹으로 보인다 (한 장이 한 그룹)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK_EXTRA", "1000");
    resetMockMemos();

    const base = MOCK_MEMOS.filter((m) => m.targetType === "general").length;
    const general = (await allGroups()).filter((g) => g.targetType === "general");
    expect(general).toHaveLength(base + 1000);
    expect(general.every((g) => g.memos.length === 1)).toBe(true);
  });

  it("만든 메모의 id는 서로 다르고 제목·내용에 번호가 있어 어디까지 왔는지 알 수 있다", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK_EXTRA", "300");
    resetMockMemos();

    const bulk = (await allGroups()).flatMap((g) => g.memos).filter((m) => m.id.startsWith("bulk-"));
    expect(bulk).toHaveLength(300);
    expect(new Set(bulk.map((m) => m.id)).size).toBe(300);
    expect(bulk.some((m) => m.title === "대량 메모 #1")).toBe(true);
    expect(bulk.some((m) => m.title === "대량 메모 #300")).toBe(true);
  });

  it("최근 수정순 정렬과 키셋 페이지네이션이 1000개에서도 빠짐·중복 없이 이어진다", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK_EXTRA", "1000");
    resetMockMemos();

    const keys = (await allGroups(20)).map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(1000);
  });

  it("잘못된 값(숫자가 아님·음수)은 무시한다", async () => {
    for (const value of ["abc", "-5", ""]) {
      vi.stubEnv("NEXT_PUBLIC_MEMOS_MOCK_EXTRA", value);
      resetMockMemos();
      expect((await allGroups()).length).toBeLessThan(20);
    }
  });
});
