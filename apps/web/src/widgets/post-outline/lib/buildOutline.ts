import { buildCategoryTree, type Category, type CategoryNode } from "@/entities/category";
import type { PostOutlineItem } from "@/entities/post";

export type OutlineFolder = {
  key: string;
  name: string;
  folders: OutlineFolder[];
  posts: PostOutlineItem[];
  // 하위 폴더까지 합친 글 수
  total: number;
};

function toFolder(node: CategoryNode): OutlineFolder {
  return { key: node.id, name: node.name, folders: node.children.map(toFolder), posts: [], total: 0 };
}

function walk(folders: OutlineFolder[], visit: (folder: OutlineFolder) => void) {
  folders.forEach((folder) => {
    visit(folder);
    walk(folder.folders, visit);
  });
}

function sumTotal(folder: OutlineFolder): number {
  folder.total = folder.posts.length + folder.folders.reduce((sum, f) => sum + sumTotal(f), 0);
  return folder.total;
}

// 카테고리 트리 위에 글을 얹는다. 글의 category는 이름 문자열이라 이름으로 폴더를 찾고,
// 내 트리에 없는 카테고리(다른 사람이 쓴 글의 카테고리 등)는 맨 아래에 이름만 있는 폴더로 붙인다.
export function buildOutline(categories: Category[], posts: PostOutlineItem[]): OutlineFolder[] {
  const roots = buildCategoryTree(categories).map(toFolder);

  const byName = new Map<string, OutlineFolder>();
  walk(roots, (folder) => {
    if (!byName.has(folder.name)) byName.set(folder.name, folder);
  });

  posts.forEach((post) => {
    let folder = byName.get(post.category);
    if (!folder) {
      folder = { key: `name:${post.category}`, name: post.category, folders: [], posts: [], total: 0 };
      byName.set(post.category, folder);
      roots.push(folder);
    }
    folder.posts.push(post);
  });

  roots.forEach(sumTotal);
  return roots;
}

// 지정한 글이 들어 있는 폴더와 그 상위 폴더들의 key — 처음에 펼쳐 둘 대상.
export function findActiveFolderKeys(folders: OutlineFolder[], postId: string): Set<string> {
  const keys = new Set<string>();
  const visit = (folder: OutlineFolder): boolean => {
    const has = folder.posts.some((p) => p.id === postId) || folder.folders.map(visit).some(Boolean);
    if (has) keys.add(folder.key);
    return has;
  };
  folders.forEach(visit);
  return keys;
}
