"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/shared/lib/api";
import { createMemo, deleteMemo, getMemos } from "../api/memos";
import { MEMO_MAX_COUNT, MEMO_TITLE_MAX_LENGTH } from "./constants";
import { MemoSaver } from "./memoSaver";
import { memosKey } from "./queryKeys";
import type { Memo, MemoSaveStatus, MemoTarget } from "./types";

type Item = { key: string; id: string | null; title: string; content: string };

export const MEMO_LIMIT_MESSAGE = `메모는 최대 ${MEMO_MAX_COUNT}장까지 만들 수 있습니다`;

/**
 * 대상(글·독서 기록)의 메모 여러 장을 불러와 탭처럼 편집하고 장마다 자동저장한다.
 * - 불러오기가 끝나기 전(ready=false)에는 편집하면 안 된다 — 서버에 이미 있는 메모가 있는데 새로 만들어 중복되는 일을 막는다.
 *   불러오기에 실패해도 ready는 false로 남는다(저장하지 않는다).
 * - 메모가 한 장도 없으면 빈 탭 한 장(id=null)으로 시작하고, 첫 입력 때 서버에 만들어진다(빈 행 방지).
 *   그 탭이 만들어지기 전에는 +(canAdd)가 막힌다.
 * - 장마다 MemoSaver가 하나씩 있어 디바운스·직렬화·재시도가 서로 섞이지 않는다. 탭을 바꾸거나 닫을 때 바로 저장한다.
 * - initialMemoId가 있으면 불러온 직후 그 메모 탭을 선택한다(메모 관리 화면에서 카드를 눌러 들어올 때). 없는 id면 첫 탭.
 * - target은 컴포넌트가 떠 있는 동안 바뀌지 않는다고 가정한다(대상이 바뀌면 새로 마운트).
 * - 화면을 열 때마다 서버 값을 새로 가져오고(캐시 재사용 안 함) 포커스로 다시 가져오지도 않는다 — 입력 중인 내용을 덮어쓰지 않으려고.
 */
export function useMemoDraft(target: MemoTarget, options: { delayMs?: number; initialMemoId?: string } = {}) {
  const { delayMs, initialMemoId } = options;
  // 처음 선택할 메모 — 불러온 직후 한 번만 쓰므로 ref로 들고 있어 값이 바뀌어도 effect가 다시 돌지 않는다
  const initialIdRef = useRef(initialMemoId);
  const query = useQuery({
    queryKey: memosKey(target),
    queryFn: () => getMemos(target),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // 재연결로 다시 불러오면 saver가 새로 만들어져 입력 중인 내용과 어긋날 수 있다
  });
  const [items, setItemsState] = useState<Item[]>([]);
  const [activeIndex, setActiveIndexState] = useState(0);
  const [status, setStatus] = useState<MemoSaveStatus>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  // 콜백(특히 비동기)이 항상 최신 목록을 보도록 ref에도 둔다
  const itemsRef = useRef<Item[]>([]);
  const activeRef = useRef(0);
  const saversRef = useRef(new Map<string, MemoSaver>());
  const keySeq = useRef(0);

  const commit = useCallback((next: Item[], active = activeRef.current) => {
    itemsRef.current = next;
    activeRef.current = active;
    setItemsState(next);
    setActiveIndexState(active);
  }, []);

  const attach = useCallback(
    (memo: Memo | null): Item => {
      const key = `k${++keySeq.current}`;
      saversRef.current.set(
        key,
        new MemoSaver({
          target,
          memo,
          delayMs,
          onStatus: setStatus,
          onCreated: (created) =>
            commit(itemsRef.current.map((i) => (i.key === key ? { ...i, id: created.id } : i))),
        }),
      );
      return { key, id: memo?.id ?? null, title: memo?.title ?? "", content: memo?.content ?? "" };
    },
    // target은 마운트 동안 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delayMs, commit],
  );

  useEffect(() => {
    if (!query.isSuccess) return;
    const savers = saversRef.current;
    const memos: (Memo | null)[] = query.data.length > 0 ? query.data : [null];
    const initial = initialIdRef.current ? query.data.findIndex((m) => m.id === initialIdRef.current) : -1;
    // 불러온 서버 데이터를 편집용 상태(+장마다 saver)로 옮기는 한 번의 초기화다 — 외부(서버) 값과 동기화하는 effect
    commit(memos.map(attach), Math.max(initial, 0));
    return () => {
      savers.forEach((s) => s.flush()); // 화면을 떠날 때 기다리던 변경을 보낸다
      savers.clear();
    };
  }, [query.isSuccess, query.data, attach, commit]);

  // 모든 장의 변경을 지금 저장한다. 돌려준 프라미스는 저장이 끝나면(실패해도) 풀린다.
  const flush = useCallback(async () => {
    await Promise.all([...saversRef.current.values()].map((s) => s.flush()));
  }, []);

  const edit = useCallback(
    (patch: { title?: string; content?: string }) => {
      const current = itemsRef.current[activeRef.current];
      if (!current) return;
      commit(itemsRef.current.map((i) => (i === current ? { ...i, ...patch } : i)));
      saversRef.current.get(current.key)?.update(patch);
    },
    [commit],
  );
  const setText = useCallback((value: string) => edit({ content: value }), [edit]);
  const setTitle = useCallback((value: string) => edit({ title: value.slice(0, MEMO_TITLE_MAX_LENGTH) }), [edit]);

  const setActiveIndex = useCallback(
    (index: number) => {
      const current = itemsRef.current[activeRef.current];
      if (current) saversRef.current.get(current.key)?.flush(); // 떠나는 탭의 변경을 바로 보낸다
      commit(itemsRef.current, index);
    },
    [commit],
  );

  const addMemo = useCallback(async () => {
    const list = itemsRef.current;
    if (list.length >= MEMO_MAX_COUNT || list.some((i) => i.id === null)) return;
    setActionError(null);
    try {
      const created = await createMemo(target, {});
      const next = [...itemsRef.current, attach(created)];
      commit(next, next.length - 1);
    } catch (e) {
      setActionError(e instanceof ApiError && e.status === 409 ? MEMO_LIMIT_MESSAGE : "메모를 추가하지 못했습니다");
    }
    // target은 마운트 동안 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attach, commit]);

  const removeMemo = useCallback(
    async (index: number) => {
      const item = itemsRef.current[index];
      if (!item?.id) return; // 아직 서버에 없는 빈 탭은 지울 게 없다
      setActionError(null);
      const saver = saversRef.current.get(item.key);
      saver?.cancel(); // 지우는 동안 기다리던 저장이 나가지 않게
      try {
        await deleteMemo(item.id);
      } catch {
        saver?.update({}); // 실패했으니 저장을 다시 건다
        setActionError("메모를 삭제하지 못했습니다");
        return;
      }
      saversRef.current.delete(item.key);
      const rest = itemsRef.current.filter((i) => i !== item);
      const active = activeRef.current;
      const nextActive = index < active ? active - 1 : Math.min(active, Math.max(rest.length - 1, 0));
      commit(rest.length > 0 ? rest : [attach(null)], rest.length > 0 ? nextActive : 0);
    },
    [attach, commit],
  );

  // 순서는 화면에서만 바꾼다(서버에 저장하지 않는다) — 새로고침하면 만든 순서로 돌아온다. 열려 있던 메모는 따라간다.
  const moveMemo = useCallback(
    (from: number, to: number) => {
      const prev = itemsRef.current;
      if (from === to || !prev[from] || to < 0 || to >= prev.length) return;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      commit(next, next.findIndex((i) => i.key === prev[activeRef.current].key));
    },
    [commit],
  );

  const active = items[activeIndex];
  return {
    items: items.map((item, i) => ({ ...item, label: item.title || `메모 ${i + 1}` })),
    activeIndex,
    setActiveIndex,
    text: active?.content ?? "",
    setText,
    title: active?.title ?? "",
    setTitle,
    addMemo,
    removeMemo,
    moveMemo,
    canAdd: query.isSuccess && items.length < MEMO_MAX_COUNT && items.every((i) => i.id !== null),
    actionError,
    ready: query.isSuccess,
    loadFailed: query.isError,
    status,
    flush,
  };
}
