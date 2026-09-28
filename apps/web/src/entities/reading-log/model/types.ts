export type ReadingLogSummary = {
  genre: string | null;
  synopsis: string | null;
  authorBio: string | null;
};

export type ReadingLog = {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  aiSummary: ReadingLogSummary | null;
};
