"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { SlashCommandItem } from "./slash-command";

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

export type SlashCommandMenuRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, Props>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => setSelected(0), [items]);

    // 목록에 높이 제한이 있어 스크롤되므로, 방향키로 고른 항목이 가려진 영역에 있으면 보이는 곳까지 스크롤한다
    useEffect(() => {
      itemRefs.current[selected]?.scrollIntoView?.({ block: "nearest" });
    }, [selected]);

    function select(index: number) {
      const item = items[index];
      if (item) command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowDown") {
          setSelected((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((prev) => (prev - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-64 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400 shadow-lg">
          일치하는 명령어가 없습니다
        </div>
      );
    }

    return (
      // 항목이 10개라 그대로 펼치면 500px이 넘어 하단 고정 바·화면 아래로 넘친다 — 높이를 제한하고 스크롤
      <div className="max-h-80 w-64 overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
        {items.map((item, index) => (
          <button
            key={item.title}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
            onClick={() => select(index)}
            onMouseEnter={() => setSelected(index)}
            className={`flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
              index === selected ? "bg-zinc-100" : ""
            }`}
          >
            <span className="font-medium">{item.title}</span>
            <span className="text-xs text-zinc-400">{item.description}</span>
          </button>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";

export default SlashCommandMenu;
