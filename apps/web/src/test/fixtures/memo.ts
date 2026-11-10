import type { Memo } from "@/entities/memo";
import { TEST_API_URL } from "@/test/msw/handlers";

/** 메모 API 주소 — MSW 핸들러와 요청 검증에 쓴다. */
export const MEMOS_URL = `${TEST_API_URL}/api/v1/memos`;

/** 메모 한 장. 기본은 글 p1에 붙은 빈 메모 m1 — 필요한 필드만 overrides로 바꾼다. */
export function makeMemo(overrides: Partial<Memo> = {}): Memo {
  return {
    id: "m1",
    targetType: "post",
    targetId: "p1",
    title: "",
    content: "",
    createdAt: "2026-11-10T00:00:00Z",
    updatedAt: "2026-11-10T00:00:00Z",
    ...overrides,
  };
}
