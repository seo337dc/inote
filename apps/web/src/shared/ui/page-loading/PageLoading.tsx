"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import InoteBlogBrand from "./InoteBlogBrand";

const MESSAGES = [
  "생각을 기록하면 오래 남습니다.",
  "쓰는 동안 생각이 정리됩니다.",
  "오늘 쓴 글이 내일의 자료가 됩니다.",
];

// inote-server(Render 무료 플랜)가 15분 비활성 시 슬립되는데, 별도 헬스체크 없이
// "이 로딩이 이 정도로 오래 떠있다" 자체를 슬립 신호로 보고 문구를 자동 전환한다.
const WAKING_AFTER_SECONDS = 4;

export default function PageLoading() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const waking = elapsed >= WAKING_AFTER_SECONDS;

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (waking) return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, [waking]);

  return (
    <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center bg-white text-zinc-800">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] opacity-70 [background-size:16px_16px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 mx-4 w-full max-w-sm px-6 text-center"
      >
        <div className="mb-10">
          <InoteBlogBrand />
        </div>

        {waking ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-zinc-700">서버가 잠들어 있어요</p>
            <p className="text-xs text-zinc-500">깨우는 중이에요. 보통 30~60초 걸려요.</p>
            <p className="mt-1 font-mono text-xs text-zinc-400">{elapsed}초 경과</p>
            <div className="relative mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
              <motion.div
                className="absolute top-0 h-full w-2/5 rounded-full bg-zinc-900"
                animate={{ x: ["-100%", "250%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-6 flex h-6 w-full items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25 }}
                  className="font-mono text-xs tracking-wide text-zinc-500"
                >
                  {MESSAGES[msgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-200">
              <motion.div
                className="absolute top-0 h-full w-2/5 rounded-full bg-zinc-900"
                animate={{ x: ["-100%", "250%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
