import { buildCategoryTree, type Category, type CategoryNode } from "@/entities/category";
import type { MyPostOutlineItem } from "@/entities/post";

export type PostFolder = {
  // 카테고리 id. 내 카테고리 트리에 없는 이름의 글을 모아 둔 폴더는 `name:<이름>`
  key: string;
  name: string;
  folders: PostFolder[];
  posts: MyPostOutlineItem[];
  // 하위 폴더까지 합친 글 수
  total: number;
  // 카테고리 트리에는 없는데 글만 그 이름을 가진 경우 (이름 수정·삭제 뒤 남은 글 등)
  isOrphan: boolean;
};

function toFolder(node: CategoryNode): PostFolder {
  return {
    key: node.id,
    name: node.name,
    folders: node.children.map(toFolder),
    posts: [],
    total: 0,
    isOrphan: false,
  };
}

function walk(folders: PostFolder[], visit: (folder: PostFolder) => void) {
  folders.forEach((folder) => {
    visit(folder);
    walk(folder.folders, visit);
  });
}

function sumTotal(folder: PostFolder): number {
  folder.total = folder.posts.length + folder.folders.reduce((sum, f) => sum + sumTotal(f), 0);
  return folder.total;
}

// 카테고리 트리(순서 반영) 위에 내 글을 얹는다. 글의 category는 이름 문자열이라 이름으로 폴더를 찾는다.
// 글의 순서는 받은 순서(최신순)를 그대로 유지한다.
export function buildPostFolders(categories: Category[], posts: MyPostOutlineItem[]): PostFolder[] {
  const roots = buildCategoryTree(categories).map(toFolder);

  const byName = new Map<string, PostFolder>();
  walk(roots, (folder) => {
    if (!byName.has(folder.name)) byName.set(folder.name, folder);
  });

  posts.forEach((post) => {
    let folder = byName.get(post.category);
    if (!folder) {
      folder = {
        key: `name:${post.category}`,
        name: post.category,
        folders: [],
        posts: [],
        total: 0,
        isOrphan: true,
      };
      byName.set(post.category, folder);
      roots.push(folder);
    }
    folder.posts.push(post);
  });

  roots.forEach(sumTotal);
  return roots;
}

// 내용(하위 폴더나 글)이 있어 펼칠 수 있는 폴더의 key 전부
export function expandableKeys(folders: PostFolder[]): string[] {
  const keys: string[] = [];
  walk(folders, (f) => {
    if (f.folders.length > 0 || f.posts.length > 0) keys.push(f.key);
  });
  return keys;
}

export function findFolder(folders: PostFolder[], key: string): PostFolder | null {
  for (const folder of folders) {
    if (folder.key === key) return folder;
    const found = findFolder(folder.folders, key);
    if (found) return found;
  }
  return null;
}

export function findPost(
  folders: PostFolder[],
  postId: string,
): { post: MyPostOutlineItem; folder: PostFolder } | null {
  for (const folder of folders) {
    const post = folder.posts.find((p) => p.id === postId);
    if (post) return { post, folder };
    const found = findPost(folder.folders, postId);
    if (found) return found;
  }
  return null;
}

export type PostDrop = { id: string; from: string; to: string };

// 글을 폴더에 놓았을 때 실제로 옮길 수 있는지 판단한다.
// - 카테고리 트리에 없는 폴더(목록에 없는 카테고리)로는 옮길 수 없고
// - 이미 그 카테고리에 있는 글은 옮길 필요가 없다
export function resolvePostDrop(
  folders: PostFolder[],
  postId: string,
  targetFolderKey: string,
): PostDrop | null {
  const source = findPost(folders, postId);
  const target = findFolder(folders, targetFolderKey);
  if (!source || !target) return null;
  if (target.isOrphan) return null;
  if (target.name === source.post.category) return null;
  return { id: postId, from: source.post.category, to: target.name };
}
