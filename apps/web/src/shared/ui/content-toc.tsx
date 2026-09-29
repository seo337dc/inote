"use client";

import { useEffect, useRef, useState } from "react";
import { revealInContainer } from "@/shared/lib/scroll";
import type { TocItem } from "@/shared/lib/toc";

// 제목이 화면 위쪽에서 이만큼(px) 안쪽으로 들어오면 "지금 읽는 제목"으로 본다
const ACTIVE_OFFSET = 120;

const INDENT = { 1: "pl-3", 2: "pl-6", 3: "pl-9" } as const;

// 글 옆에 고정되는 목차. 항목을 누르면 그 제목으로 부드럽게 이동하고 주소 뒤에 #제목이 붙는다.
// 이 앱은 window가 아니라 main 요소가 스크롤되므로, 스크롤 추적도 그 요소 기준으로 한다.
export function ContentToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  // 항목을 눌러 이동하는 동안(부드러운 스크롤)에는 스크롤 위치로 강조를 다시 계산하지 않는다.
  // 글 끝쪽 제목은 화면 맨 위까지 못 올라와서(스크롤이 바닥에서 멈춤) 계산하면 앞 제목으로 덮어써지기 때문.
  const navRef = useRef<HTMLElement>(null);
  const lockRef = useRef(false);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function releaseLockLater(ms: number) {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => {
      lockRef.current = false;
    }, ms);
  }

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const scroller = headings[0].closest("main");
    const target: HTMLElement | Window = scroller ?? window;

    function update() {
      if (lockRef.current) {
        // 클릭 이동 중: 스크롤이 멈출 때(마지막 스크롤 이벤트 후 잠깐)까지 강조를 유지
        releaseLockLater(150);
        return;
      }
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - top <= ACTIVE_OFFSET) current = heading.id;
      }
      // 스크롤이 맨 아래에 닿았으면 마지막 제목을 현재 위치로 본다 (짧은 글의 끝 제목은 위쪽 기준선까지 못 올라옴)
      if (scroller && scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        current = headings[headings.length - 1].id;
      }
      setActiveId(current);
    }

    update();
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // update가 잠금·타이머 ref만 쓰므로 items가 바뀔 때만 다시 등록하면 된다
  }, [items]);

  useEffect(
    () => () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    },
    [],
  );

  // 목차 자체가 길어 따로 스크롤될 때, 강조된 항목이 목차 영역 안에 계속 보이도록 따라간다
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current]");
    if (nav && current) revealInContainer(nav, current);
  }, [activeId]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    setActiveId(id);
    lockRef.current = true;
    releaseLockLater(800); // 이미 그 위치라 스크롤이 안 일어나도 잠금이 풀리도록 하는 안전장치
  }

  return (
    <nav
      ref={navRef}
      aria-label="목차"
      className="hide-scrollbar sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"
    >
      {/* 세로선은 "목차" 제목부터 목록 끝까지 한 줄로 이어지게 감싸는 div의 왼쪽 테두리로 그린다.
          (스크롤되는 nav 바깥으로 삐져나가면 잘려서, 선은 nav 안쪽 div에 둠) */}
      <div className="border-l-2 border-zinc-200">
        <p className="mb-2 pl-3 text-xs font-semibold tracking-wide text-zinc-500">목차</p>
        <ul>
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`#${encodeURIComponent(item.id)}`}
                  onClick={(e) => handleClick(e, item.id)}
                  aria-current={active ? "location" : undefined}
                  className={`-ml-0.5 block border-l-2 py-1 pr-1 text-[13px] leading-snug ${INDENT[item.level]} ${
                    active
                      ? "border-zinc-900 font-medium text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
