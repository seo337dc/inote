export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type ChatSession = {
  id: string;
  post_id: string | null;
  post_title: string | null;
  post_category: string | null;
  updated_at: string;
  last_message: string | null;
};
