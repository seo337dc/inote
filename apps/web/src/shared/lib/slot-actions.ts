"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * 화면(feature)이 공용 UI 자리(slot)에 끼워 넣는 버튼.
 * 도크·헤더(widgets)는 글쓰기 같은 feature를 import할 수 없어서, 화면 쪽이 마운트될 때 이 레지스트리에
 * 자신을 등록하고 슬롯을 그리는 쪽은 등록된 것만 그린다. 아무것도 등록되지 않았으면 그 슬롯은 비어 있다.
 * 버튼이 여는 패널·시트의 본체는 등록한 화면이 직접 그린다(헤더는 버튼만 그린다).
 *
 * - `dock`: 모바일 오른쪽 아래 도크(AI 버튼 옆, ⋮로 펼쳐지는 버튼들)
 * - `header-left`: 모바일 헤더 왼쪽 (로고는 항상 가운데)
 */
export type Slot = "dock" | "header-left";

export type SlotAction = {
  id: string;
  /** 슬롯 (생략하면 `dock`). */
  slot?: Slot;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  /** 버튼 색상 등 (기본은 중립색). */
  className?: string;
};

const EMPTY: SlotAction[] = [];
let actions: SlotAction[] = EMPTY;
const listeners = new Set<() => void>();
// useSyncExternalStore의 getSnapshot은 값이 같으면 같은 참조를 돌려줘야 해서 슬롯별 결과를 캐시한다
let bySlot: Partial<Record<Slot, SlotAction[]>> = {};

const slotOf = (action: SlotAction): Slot => action.slot ?? "dock";

function emit() {
  bySlot = {};
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 등록하고, 해제 함수를 돌려준다. 같은 슬롯에서 같은 id가 이미 있으면 새 것으로 바꾼다. */
export function registerSlotAction(action: SlotAction): () => void {
  actions = [...actions.filter((a) => !(a.id === action.id && slotOf(a) === slotOf(action))), action];
  emit();
  return () => {
    const next = actions.filter((a) => a !== action);
    actions = next.length === 0 ? EMPTY : next;
    emit();
  };
}

function snapshot(slot: Slot): SlotAction[] {
  if (!bySlot[slot]) {
    const list = actions.filter((a) => slotOf(a) === slot);
    bySlot[slot] = list.length === 0 ? EMPTY : list;
  }
  return bySlot[slot]!;
}

export function useSlotActions(slot: Slot = "dock"): SlotAction[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(slot),
    () => EMPTY,
  );
}

/** action은 참조가 안정적이어야 한다(useMemo) — 바뀔 때마다 해제 후 다시 등록된다. */
export function useRegisterSlotAction(action: SlotAction | null) {
  // null이면 등록하지 않는다 — 훅은 조건부로 못 부르므로 "이번에는 건너뛴다"를 null로 표현한다
  useEffect(() => (action ? registerSlotAction(action) : undefined), [action]);
}
