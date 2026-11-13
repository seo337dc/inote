import type { MemoGroup, MemoTargetType } from "./types";

// 메모 그룹의 key와 정렬 규칙 — 서버(GET /memos/groups)와 같아야 한다 (계약: docs/todo/memo.md 4차).
// 캐시 병합(syncMemoGroups.ts)이 서버와 같은 순서로 맞추려고 쓴다. 의존성 없는 순수 파일이라 어디서든 가져다 쓸 수 있다.

/** 그룹 key — 일반 메모는 메모 id(한 장이 한 그룹), 글·독서는 "종류:대상id". */
export const keyOf = (type: MemoTargetType, targetId: string, memoId: string) => (type === "general" ? memoId : `${type}:${targetId}`);

/** 그룹의 updatedAt 내림차순, 같으면 key 내림차순. */
export const compareGroups = (a: MemoGroup, b: MemoGroup) => b.updatedAt.localeCompare(a.updatedAt) || b.key.localeCompare(a.key);
