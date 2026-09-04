import type { Category } from "@/entities/category";

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: Category;
  createdAt: string;
  updatedAt: string;
};
