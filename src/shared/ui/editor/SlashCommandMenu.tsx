"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
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

    useEffect(() => setSelected(0), [items]);

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
      <div className="w-64 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => select(index)}
            onMouseEnter={() => setSelected(index)}
            className={`flex w-full flex-col rounded px-3 py-2 text-left text-sm ${
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
