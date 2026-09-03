import type { Category } from "@/entities/category";

export type Post = {
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  author: string;
  createdAt: string;
  mine?: boolean;
};
