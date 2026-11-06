"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCreateTodo } from "@/entities/todo";
import type { TodoProposal } from "../model/types";

type Props = {
  proposal: TodoProposal;
  onUpdate: (update: (prev: TodoProposal) => TodoProposal) => void;
};

const TODOS_PATH = "/todos";

export default function TodoProposalCard({ proposal, onUpdate }: Props) {
  const router = useRouter();
  const createTodo = useCreateTodo();
  const { items, status, addedCount, failedCount } = proposal;
  const selected = items.filter((i) => i.selected);

  // 끝난 카드는 한 줄 요약으로 접는다 — 같은 카드로 다시 추가할 수 없어 중복 추가도 막힌다
  if (status === "done") {
    return <Summary icon>{addedCount}개를 할 일에 추가했어요.</Summary>;
  }
  if (status === "partial") {
    return (
      <Summary>
        {addedCount + failedCount}개 중 {addedCount}개를 추가했어요. {failedCount}개는 추가하지 못했어요.
      </Summary>
    );
  }
  if (status === "cancelled") return <Summary>할 일에 추가하지 않았어요.</Summary>;

  const adding = status === "adding";

  function toggle(id: string) {
    onUpdate((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)),
    }));
  }

  async function handleAdd() {
    const targets = selected;
    onUpdate((prev) => ({ ...prev, status: "adding", failedCount: 0 }));

    // 목록은 최신순이라, 마지막 항목부터 만들어야 대화에 적힌 순서대로 위에서부터 보인다
    let added = 0;
    for (const item of [...targets].reverse()) {
      try {
        await createTodo.mutateAsync({ title: item.title });
        added += 1;
      } catch {
        // 한 항목이 실패해도 나머지는 계속 만든다 — 마지막에 실패 개수를 알려준다
      }
    }
    const failed = targets.length - added;

    if (added === 0) {
      // 하나도 못 만들었으면 접지 않고 다시 시도할 수 있게 둔다
      onUpdate((prev) => ({ ...prev, status: "pending", failedCount: failed }));
      return;
    }
    onUpdate((prev) => ({
      ...prev,
      status: failed === 0 ? "done" : "partial",
      addedCount: added,
      failedCount: failed,
    }));
    // 전부 성공했을 때만 할 일 페이지로 간다 — 일부 실패면 실패 사실을 읽을 수 있게 채팅에 머문다
    if (failed === 0) router.push(TODOS_PATH);
  }

  return (
    <div className="max-w-[85%] min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm">
      <p className="mb-1.5 font-semibold text-zinc-700">할 일에 추가 ({items.length})</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={item.selected}
                disabled={adding}
                onChange={() => toggle(item.id)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-zinc-900"
              />
              <span className={item.selected ? "text-zinc-800" : "text-zinc-400"}>{item.title}</span>
            </label>
          </li>
        ))}
      </ul>

      {failedCount > 0 && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          추가하지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <div className="mt-2.5 flex justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={adding}
          onClick={() => onUpdate((prev) => ({ ...prev, status: "cancelled" }))}
        >
          취소
        </Button>
        <Button type="button" size="sm" disabled={adding || selected.length === 0} onClick={handleAdd}>
          {adding ? "추가 중…" : `${selected.length}개 추가`}
        </Button>
      </div>
    </div>
  );
}

function Summary({ icon = false, children }: { icon?: boolean; children: React.ReactNode }) {
  return (
    <p className="flex max-w-[85%] items-center gap-1 px-1 text-xs text-zinc-500">
      {icon && <Check className="size-3.5 text-emerald-600" />}
      {children}
    </p>
  );
}
