import type { MemoTarget } from "../model/types";

// 경로의 "세그먼트 한 개짜리 id"를 가진 상세 화면 → 메모 대상 종류.
// 목록(/posts)·새 글쓰기(/write, /reading/write)에는 id가 없으므로 아래 규칙에 걸리지 않고 일반 메모가 된다.
const DETAIL_ROUTES: Record<string, "post" | "reading"> = {
  write: "post",
  posts: "post",
  reading: "reading",
};
// 같은 위치에 있어도 id가 아닌 고정 경로 — "/reading/write"는 독서 id가 'write'인 상세가 아니라 새 글쓰기다
const NOT_AN_ID = new Set(["write"]);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// 지금 화면의 메모장이 다룰 대상을 경로만으로 정한다 (계약: docs/todo/memo.md 3차).
// - 글쓰기·글 상세 → 그 글, 독서 상세 → 그 독서 기록, 그 밖의 화면 → 일반 메모
// - 관리자 화면(/admin 이하, 보류 중)과 메모 관리 화면(/memos 이하)은 null — 메모장을 숨긴다
// "내 글인지"·로그인 여부는 이 함수가 모른다. 남의 글이거나 비로그인이면 호출하는 컴포넌트가 숨긴다.
export function resolveMemoTarget(pathname: string): MemoTarget | null {
  const path = pathname.split(/[?#]/)[0];
  const segments = path.split("/").filter(Boolean);

  // 메모 관리 화면은 메모를 모아 보는 곳이라 메모장 버튼이 필요 없다
  if (segments[0] === "admin" || segments[0] === "memos") return null;

  if (segments.length === 2) {
    const [route, id] = segments;
    const type = DETAIL_ROUTES[route];
    if (type && !NOT_AN_ID.has(id)) return { type, id: safeDecode(id) };
  }
  return { type: "general" };
}
