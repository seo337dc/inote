export type Category = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryNode = Category & { children: CategoryNode[] };
