import { buildCategoryTree, type Category, type CategoryNode } from "@/entities/category";
import type { MyPostOutlineItem } from "@/entities/post";

export type PostFolder = {
  // 카테고리 id. 카테고리가 아직 지정되지 않은 글(categoryId가 null)을 이름별로 모아 둔 폴더는 `name:<이름>`
  key: string;
  name: string;
  folders: PostFolder[];
  posts: MyPostOutlineItem[];
  // 하위 폴더까지 합친 글 수
  total: number;
  // 카테고리 트리에 연결되지 않은 글의 폴더 — 같은 이름이 두 곳이라 자동으로 못 이은 옛 글 등. 여기 글을 진짜 카테고리 폴더로 끌어다 놓아 지정한다
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

// 카테고리 트리(순서 반영) 위에 내 글을 얹는다. 글은 카테고리 id로 폴더를 찾는다 — 같은 이름이 다른 부모 아래에 있어도 섞이지 않는다.
// 카테고리 id가 없거나 트리에 없는 글은 이름별 "연결 안 된 폴더"(isOrphan)에 모은다.
// 글의 순서는 받은 순서(최신순)를 그대로 유지한다.
export function buildPostFolders(categories: Category[], posts: MyPostOutlineItem[]): PostFolder[] {
  const roots = buildCategoryTree(categories).map(toFolder);

  const byId = new Map<string, PostFolder>();
  walk(roots, (folder) => byId.set(folder.key, folder));
  const orphanByName = new Map<string, PostFolder>();

  posts.forEach((post) => {
    const folder = post.categoryId ? byId.get(post.categoryId) : undefined;
    if (folder) {
      folder.posts.push(post);
      return;
    }
    let orphan = orphanByName.get(post.category);
    if (!orphan) {
      orphan = {
        key: `name:${post.category}`,
        name: post.category,
        folders: [],
        posts: [],
        total: 0,
        isOrphan: true,
      };
      orphanByName.set(post.category, orphan);
      roots.push(orphan);
    }
    orphan.posts.push(post);
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

// from은 옮기기 전 카테고리 id(아직 지정 안 된 글이면 null), to는 옮길 카테고리
export type PostDrop = { id: string; from: string | null; to: { id: string; name: string } };

// 글을 폴더에 놓았을 때 실제로 옮길 수 있는지 판단한다.
// - 카테고리 트리에 연결되지 않은 폴더(연결 안 된 글 모음)로는 옮길 수 없고
// - 이미 그 카테고리(id)에 있는 글은 옮길 필요가 없다
export function resolvePostDrop(
  folders: PostFolder[],
  postId: string,
  targetFolderKey: string,
): PostDrop | null {
  const source = findPost(folders, postId);
  const target = findFolder(folders, targetFolderKey);
  if (!source || !target) return null;
  if (target.isOrphan) return null;
  if (target.key === source.post.categoryId) return null;
  return { id: postId, from: source.post.categoryId, to: { id: target.key, name: target.name } };
}
