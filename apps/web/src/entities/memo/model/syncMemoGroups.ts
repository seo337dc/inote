import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { getMemos } from "../api/memos";
import { compareGroups, keyOf } from "./groupRules";
import { MEMO_GROUPS_KEY } from "./useMemoGroups";
import type { Memo, MemoGroup, MemoGroupPage, MemoTarget, MemoTargetType } from "./types";

type GroupsData = InfiniteData<MemoGroupPage, string | undefined>;

const byUpdatedDesc = (a: Memo, b: Memo) => b.updatedAt.localeCompare(a.updatedAt);


// 대상의 메모들을 서버가 주는 그룹 모양으로 — 글·독서는 대상 하나가 한 그룹, 일반 메모는 한 장이 한 그룹
function groupsOf(target: MemoTarget, memos: Memo[], titleOf: (key: string) => string | null): MemoGroup[] {
  if (target.type === "general") {
    return memos.map((memo) => ({
      key: memo.id,
      targetType: "general" as const,
      targetId: "",
      targetTitle: null,
      updatedAt: memo.updatedAt,
      memos: [memo],
    }));
  }
  if (memos.length === 0) return [];
  const sorted = [...memos].sort(byUpdatedDesc);
  const key = keyOf(target.type, target.id, "");
  return [{ key, targetType: target.type, targetId: target.id, targetTitle: titleOf(key), updatedAt: sorted[0].updatedAt, memos: sorted }];
}

/**
 * 메모장에서 고친 대상의 메모(memos = 그 대상의 내 메모 전부)를, 이미 받아 둔 그룹 목록에 반영한다.
 * 닫을 때마다 지금까지 받은 모든 페이지를 다시 요청하지 않으려는 것이다(5000개면 250번).
 * - 그 대상의 그룹을 지우고 새 그룹으로 바꿔 넣은 뒤 서버 규칙대로 다시 정렬한다(고친 그룹이 맨 앞으로).
 * - 아직 받지 않은 더 오래된 그룹은 끼워 넣지 않는다(이어 받을 때 서버가 준다). 더 받을 페이지가 없으면 전부 넣는다.
 * - 페이지는 하나로 합치고 nextCursor는 마지막 페이지의 것을 유지한다(그 뒤로는 서버가 이어서 준다).
 * - variantType(종류 탭)이 이 대상의 종류와 다르면 그 목록은 건드리지 않는다.
 */
export function mergeEditedTarget(data: GroupsData, target: MemoTarget, memos: Memo[], variantType: MemoTargetType | undefined): GroupsData {
  if (variantType && variantType !== target.type) return data;

  const old = data.pages.flatMap((page) => page.items);
  const nextCursor = data.pages[data.pages.length - 1]?.nextCursor ?? null;
  const isTarget = (g: MemoGroup) => (target.type === "general" ? g.targetType === "general" : g.targetType === target.type && g.targetId === target.id);

  const titles = new Map(old.map((g) => [g.key, g.targetTitle]));
  const knownKeys = new Set(old.map((g) => g.key));
  const tail = [...old].sort(compareGroups).at(-1);

  const fresh = groupsOf(target, memos, (key) => titles.get(key) ?? null).filter(
    // 이미 받아 둔 그룹이거나, 받아 둔 범위(꼬리) 안이거나, 더 받을 게 없으면 넣는다
    (g) => knownKeys.has(g.key) || nextCursor === null || !tail || compareGroups(g, tail) <= 0,
  );
  const items = [...old.filter((g) => !isTarget(g)), ...fresh].sort(compareGroups);

  return { pages: [{ items, nextCursor }], pageParams: [data.pageParams[0]] };
}

/**
 * 메모장을 닫은 뒤 호출한다 — 고친 대상의 메모를 한 번만 받아 받아 둔 모든 그룹 목록(전체·종류별 탭)에 반영한다.
 * 받지 못하면(네트워크 오류 등) 안전하게 그룹 목록을 무효화해 다시 불러온다.
 */
export async function syncMemoGroupsAfterEdit(queryClient: QueryClient, target: MemoTarget): Promise<void> {
  let memos: Memo[];
  try {
    memos = await getMemos(target);
  } catch {
    await queryClient.invalidateQueries({ queryKey: MEMO_GROUPS_KEY });
    return;
  }
  for (const query of queryClient.getQueryCache().findAll({ queryKey: MEMO_GROUPS_KEY })) {
    const data = query.state.data as GroupsData | undefined;
    if (!data) continue;
    const variant = query.queryKey[2] as MemoTargetType | "all" | undefined;
    queryClient.setQueryData(query.queryKey, mergeEditedTarget(data, target, memos, variant === "all" ? undefined : variant));
  }
}
