// 글 찾기 답변의 출처 글 — 링크는 모델이 쓰지 않고, 이 글 id로 화면이 주소(/posts/{id})를 만든다.
export type ChatSource = {
  id: string;
  title: string;
  category: string;
  score: number;
};

// 빈 채팅 화면의 시작 버튼 — 버튼 글자(label)와 누르면 일어나는 일(action)을 따로 둔다.
// 화면마다 "글자를 질문으로 보낸다"가 아닌 동작(안내 문구만 보여주기, 이동 등)이 필요해질 때 action 종류만 늘린다.
export type ChatSuggestionAction =
  | { type: "ask"; text: string } // text를 질문으로 보낸다
  | { type: "reply"; text: string }; // 서버를 부르지 않고, 버튼 글자를 사용자 말로·text를 답변으로 바로 보여준다

export type ChatSuggestion = {
  label: string;
  action: ChatSuggestionAction;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  // 글 찾기 모드에서, 내 글을 근거로 답했을 때만 있다 (일반 답변이면 없음)
  sources?: ChatSource[];
  // 화면이 직접 채운 말풍선(시작 버튼의 안내 답변 등) — 서버에 보내는 대화에는 넣지 않는다
  local?: boolean;
};

// 대화가 시작된 화면의 종류 — 한 히스토리에 모아 보여주되 뱃지로 구분한다 (AI 서버 conversation_sessions.kind)
export type ChatSessionKind = "write" | "posts" | "reading" | "todo";

export type ChatSession = {
  id: string;
  kind: ChatSessionKind;
  post_id: string | null;
  post_title: string | null;
  post_category: string | null;
  updated_at: string;
  last_message: string | null;
  // 첫 사용자 질문 — 목록 제목으로 쓴다 (AI 서버가 아직 안 주는 옛 배포에서는 없을 수 있다)
  first_question?: string | null;
};
