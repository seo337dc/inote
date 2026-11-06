import type { MemoTarget } from "./types";

export const memosKey = (target: MemoTarget) => ["memos", target.type, target.id] as const;
