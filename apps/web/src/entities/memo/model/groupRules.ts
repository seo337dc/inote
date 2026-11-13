import type { MemoGroup, MemoTargetType } from "./types";

// 메모 그룹의 key와 정렬 규칙 — 서버(GET /memos/groups)와 같아야 한다 (계약: docs/todo/memo.md 4차).
// 목 저장소(mock.ts)와 캐시 병합(syncMemoGroups.ts)이 함께 쓰므로 순환 import를 피하려고 의존성 없는 파일에 둔다.

/** 그룹 key — 일반 메모는 메모 id(한 장이 한 그룹), 글·독서는 "종류:대상id". */
export const keyOf = (type: MemoTargetType, targetId: string, memoId: string) => (type === "general" ? memoId : `${type}:${targetId}`);

/** 그룹의 updatedAt 내림차순, 같으면 key 내림차순. */
export const compareGroups = (a: MemoGroup, b: MemoGroup) => b.updatedAt.localeCompare(a.updatedAt) || b.key.localeCompare(a.key);
