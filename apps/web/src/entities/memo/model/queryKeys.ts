import type { MemoTarget } from "./types";

export const memosKey = (target: MemoTarget) =>
  target.type === "general" ? (["memos", "general"] as const) : (["memos", target.type, target.id] as const);
