export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  userId: string | null;
  user: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isPrivate: boolean;
  pinned: boolean;
  aiSummary: { summary: string[] } | null;
};
