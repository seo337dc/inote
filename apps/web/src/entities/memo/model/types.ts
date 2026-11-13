// 메모 API 계약 (docs/todo/memo.md). 메모는 글·독서 기록 하나에 붙거나 대상 없는 일반 메모이고, 작성자 본인만 본다.
export type MemoTargetType = "post" | "reading" | "general";

// 일반 메모(general)는 대상이 없어 id가 없다 — 서버가 targetId를 ""로 저장한다
export type MemoTarget = { type: "post" | "reading"; id: string } | { type: "general" };

export type Memo = {
  id: string;
  targetType: MemoTargetType;
  targetId: string; // 일반 메모는 ""
  targetTitle?: string | null; // 글·독서 제목 — 전체 목록 조회에서만 채워지고 일반 메모는 null
  title: string; // 비어 있으면 탭에는 번호("메모 1")로 보인다
  content: string;
  createdAt: string;
  updatedAt: string;
};

// 메모 관리 화면의 카드 하나 — 글·독서는 대상 하나의 메모 전부(최근 수정순, 최대 10장), 일반 메모는 한 장이 한 그룹.
// 계약: docs/todo/memo.md 4차 GET /memos/groups
export type MemoGroup = {
  key: string; // 일반 메모는 메모 id, 글·독서는 "종류:대상id"
  targetType: MemoTargetType;
  targetId: string;
  targetTitle: string | null;
  updatedAt: string; // 그룹 안 가장 최근 수정 시각
  memos: Memo[];
};
export type MemoGroupPage = { items: MemoGroup[]; nextCursor: string | null };

// idle: 아직 저장한 적 없음 / saving: 요청 중 / saved: 마지막 요청 성공 / error: 마지막 요청 실패(다음 입력에서 다시 시도)
export type MemoSaveStatus = "idle" | "saving" | "saved" | "error";
