import { describe, expect, it } from "vitest";
import { makeMemoGroup } from "@/test/fixtures/memo";
import { compareGroups, keyOf } from "./groupRules";

// 그룹의 key와 정렬 규칙 — 서버(GET /memos/groups)와 같아야 하고, 목 저장소·캐시 병합이 함께 쓴다 (계약: docs/todo/memo.md 4차)
describe("keyOf", () => {
  it("일반 메모는 메모 id, 글·독서는 '종류:대상id'다", () => {
    expect(keyOf("general", "", "m1")).toBe("m1");
    expect(keyOf("post", "p1", "m1")).toBe("post:p1");
    expect(keyOf("reading", "r1", "m9")).toBe("reading:r1");
  });
});

describe("compareGroups", () => {
  const g = (key: string, updatedAt: string) => makeMemoGroup({ key, updatedAt });

  it("updatedAt이 최근인 그룹이 앞이다 (내림차순)", () => {
    const sorted = [g("a", "2026-11-01T00:00:00Z"), g("b", "2026-11-09T00:00:00Z")].sort(compareGroups);
    expect(sorted.map((x) => x.key)).toEqual(["b", "a"]);
  });

  it("같은 시각이면 key가 큰 그룹이 앞이다 (key 내림차순)", () => {
    const t = "2026-11-05T00:00:00Z";
    const sorted = [g("post:p1", t), g("post:p2", t), g("general-x", t)].sort(compareGroups);
    expect(sorted.map((x) => x.key)).toEqual(["post:p2", "post:p1", "general-x"]);
  });

  it("같은 그룹끼리는 0이다", () => {
    expect(compareGroups(g("a", "2026-11-01T00:00:00Z"), g("a", "2026-11-01T00:00:00Z"))).toBe(0);
  });
});
