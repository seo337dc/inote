// 메모 API 계약 (docs/todo/memo.md). 메모는 글 또는 독서 기록 하나에 붙고, 작성자 본인만 본다.
export type MemoTargetType = "post" | "reading";

export type MemoTarget = { type: MemoTargetType; id: string };

export type Memo = {
  id: string;
  targetType: MemoTargetType;
  targetId: string;
  title: string; // 비어 있으면 탭에는 번호("메모 1")로 보인다
  content: string;
  createdAt: string;
  updatedAt: string;
};

// idle: 아직 저장한 적 없음 / saving: 요청 중 / saved: 마지막 요청 성공 / error: 마지막 요청 실패(다음 입력에서 다시 시도)
export type MemoSaveStatus = "idle" | "saving" | "saved" | "error";
