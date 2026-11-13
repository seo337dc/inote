import type { Memo, MemoGroup, MemoGroupPage } from "@/entities/memo";
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

/** 메모 그룹 API 주소 */
export const MEMO_GROUPS_URL = `${MEMOS_URL}/groups`;

/** 메모 그룹(카드 한 장). 기본은 글 p1의 메모 한 장 — memos를 주면 그 안의 첫 메모가 가장 최근 수정한 것이다. */
export function makeMemoGroup(overrides: Partial<MemoGroup> = {}): MemoGroup {
  const targetType = overrides.targetType ?? "post";
  const targetId = overrides.targetId ?? "p1";
  const memos = overrides.memos ?? [makeMemo({ targetType, targetId })];
  return {
    key: targetType === "general" ? memos[0]?.id ?? "g" : `${targetType}:${targetId}`,
    targetType,
    targetId,
    targetTitle: targetType === "general" ? null : "글 제목",
    updatedAt: memos[0]?.updatedAt ?? "2026-11-10T00:00:00Z",
    memos,
    ...overrides,
  };
}

export const makeGroupPage = (items: MemoGroup[], nextCursor: string | null = null): MemoGroupPage => ({ items, nextCursor });
