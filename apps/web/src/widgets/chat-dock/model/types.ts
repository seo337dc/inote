// 글 찾기 답변의 출처 글 — 링크는 모델이 쓰지 않고, 이 글 id로 화면이 주소(/posts/{id})를 만든다.
export type ChatSource = {
  id: string;
  title: string;
  category: string;
  score: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  // 글 찾기 모드에서, 내 글을 근거로 답했을 때만 있다 (일반 답변이면 없음)
  sources?: ChatSource[];
};

export type ChatSession = {
  id: string;
  post_id: string | null;
  post_title: string | null;
  post_category: string | null;
  updated_at: string;
  last_message: string | null;
};
