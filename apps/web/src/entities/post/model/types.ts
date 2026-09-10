import type { Category } from "@/entities/category";

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: Category;
  userId: string | null;
  user: { name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};
