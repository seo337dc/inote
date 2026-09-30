"use client";

import { useRef } from "react";
import { cn } from "@/shared/lib/utils";

export type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  // 탭 패널의 aria-labelledby와 짝을 맞추기 위한 id 접두사 (탭 버튼 id = `${idPrefix}-tab-${id}`)
  idPrefix: string;
};

// 밑줄형 탭. 좌우 화살표·Home·End로 이동한다 (WAI-ARIA tabs 패턴).
export function Tabs({ tabs, value, onChange, ariaLabel, idPrefix }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(toIndex: number) {
    const next = tabs[(toIndex + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight") move(index + 1);
    else if (e.key === "ArrowLeft") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(tabs.length - 1);
    else return;
    e.preventDefault();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b border-zinc-200">
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm",
              selected
                ? "border-zinc-900 font-medium text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
