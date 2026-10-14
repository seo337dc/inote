import type { ChatReply } from "./types";

// "글을 쓰고 싶어" 안내 — 작성 중인 글(임시저장)이 있으면 이어 쓸 수 있게 목록으로, 없으면 새 글 쓰기만.
// 서버(AI)를 부르지 않는다. 설계: inote 레포 docs/kure/PLAN.md 결정 17 ⑤.

export const MAX_SHOWN_DRAFTS = 5;

type Draft = { id: string; title: string; category?: string | null };

const NEW_POST_LINK = { href: "/write", label: "새 글 쓰기" };

export async function loadWriteGuide(isLoggedIn: boolean, fetchDrafts: () => Promise<Draft[]>): Promise<ChatReply> {
  if (!isLoggedIn) {
    return { text: "글쓰기는 로그인 후에 이용할 수 있어요.", links: [{ href: "/login", label: "로그인하기" }] };
  }

  let drafts: Draft[];
  try {
    drafts = await fetchDrafts();
  } catch {
    return { text: "작성 중인 글을 불러오지 못했어요. 새 글은 바로 시작할 수 있어요.", links: [NEW_POST_LINK] };
  }

  if (drafts.length === 0) {
    return { text: "작성 중인 글이 없어요. 새 글을 시작해 볼까요?", links: [NEW_POST_LINK] };
  }

  const shown = drafts.slice(0, MAX_SHOWN_DRAFTS);
  const more = drafts.length > shown.length ? ` (최근 ${shown.length}개만 보여드려요)` : "";
  return {
    text: `작성 중인 글이 ${drafts.length}개 있어요. 이어서 쓰거나 새로 시작할 수 있어요.${more}`,
    links: [
      ...shown.map((d) => ({
        href: `/write/${encodeURIComponent(d.id)}`,
        label: d.title.trim() || "(제목 없음)",
        hint: d.category?.trim() ? `${d.category.trim()} · 작성 중` : "작성 중",
      })),
      NEW_POST_LINK,
    ],
  };
}
