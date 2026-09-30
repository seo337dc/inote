export type Category = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  depth: number;
  // 같은 부모 안에서의 순서 (0부터). 드래그로 바꾼다
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryNode = Category & { children: CategoryNode[] };
