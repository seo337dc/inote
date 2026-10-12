import type { QueryClient } from "@tanstack/react-query";
import { TASK_GROUPS_KEY } from "./keys";
import type { TaskGroup } from "./types";

// 묶음·작업 변경은 모두 같은 mutationKey를 쓴다 — 여러 변경이 연달아 진행 중이면 마지막 것이 끝날 때만
// 서버 값으로 다시 맞춰서, 먼저 끝난 요청의 재조회가 아직 진행 중인 낙관적 상태를 덮어쓰지 않게 한다.
export const TASK_MUTATION_KEY = ["task-groups-mutation"];

// 서버 응답 전에 화면의 캐시를 먼저 바꾸고(로딩 표시 없음), 되돌릴 이전 값을 돌려준다.
export async function applyOptimistic(queryClient: QueryClient, update: (groups: TaskGroup[]) => TaskGroup[]) {
  await queryClient.cancelQueries({ queryKey: TASK_GROUPS_KEY });
  const previous = queryClient.getQueryData<TaskGroup[]>(TASK_GROUPS_KEY);
  if (previous) queryClient.setQueryData(TASK_GROUPS_KEY, update(previous));
  return { previous };
}

export function rollback(queryClient: QueryClient, context?: { previous?: TaskGroup[] }) {
  if (context?.previous) queryClient.setQueryData(TASK_GROUPS_KEY, context.previous);
}

export function settle(queryClient: QueryClient) {
  if (queryClient.isMutating({ mutationKey: TASK_MUTATION_KEY }) <= 1) {
    queryClient.invalidateQueries({ queryKey: TASK_GROUPS_KEY });
  }
}
