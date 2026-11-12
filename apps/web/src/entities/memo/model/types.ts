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

// idle: 아직 저장한 적 없음 / saving: 요청 중 / saved: 마지막 요청 성공 / error: 마지막 요청 실패(다음 입력에서 다시 시도)
export type MemoSaveStatus = "idle" | "saving" | "saved" | "error";
