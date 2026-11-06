// 채팅이 제안한 할 일 — 사용자가 카드에서 확인해야 실제로 추가된다
export type TodoProposalItem = { id: string; title: string; selected: boolean };

export type TodoProposal = {
  items: TodoProposalItem[];
  // pending: 확인 대기 / adding: 추가 요청 중 / done·partial·cancelled: 끝난 뒤 한 줄 요약으로 접힌다
  status: "pending" | "adding" | "done" | "partial" | "cancelled";
  addedCount: number;
  // pending 상태에서 0보다 크면 "전부 실패해서 다시 시도할 수 있는" 상태다
  failedCount: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  todoProposal?: TodoProposal;
};

export type ChatSession = {
  id: string;
  post_id: string | null;
  post_title: string | null;
  post_category: string | null;
  updated_at: string;
  last_message: string | null;
};
