"use client";

import { usePathname } from "next/navigation";
import ChatDock from "./ChatDock";
import DesktopChatPanel from "./DesktopChatPanel";
import { useChatMessages } from "../model/useChatMessages";
import { usePostsChatMessages } from "../model/usePostsChatMessages";
import { useReadingChatMessages } from "../model/useReadingChatMessages";

type Props = {
  nav: React.ReactNode;
  children: React.ReactNode;
};

// AI 패널이 헤더 옆에서부터 화면 전체 높이로 이어지도록,
// (헤더+본문)을 한 세로 컬럼으로 묶고 그 옆에 AI 패널을 나란히 둔다.
//   header | llm
//   main   | llm
export default function ChatWorkspace({ nav, children }: Props) {
  const pathname = usePathname();
  const isReadingRoute = pathname?.startsWith("/reading") ?? false;
  // 글 목록(홈) 화면 — 공개 글을 먼저 검색해서 답하는 "글 찾기" 모드. 내 글(/my-posts)·사용자 글 목록 등은 비공개 글이 섞일 수 있어
  // 요청자 검증 전인 1차 범위(공개 글만)에서는 홈만 쓴다. 설계: inote 레포 docs/kure/PLAN.md 결정 17.
  const isPostsRoute = pathname === "/";

  // 독서 관련 페이지(/reading, /reading/write, /reading/[id])에서는 채팅 도크가
  // "독서 상담" 모드(대화 저장 없음, /reading-chat/stream)로, 글 목록(홈 "/")에서는
  // "글 찾기" 모드(대화 저장 없음, /posts-chat/stream)로 동작하고, 그 외에는
  // 기존 글쓰기/일반 모드 그대로 유지.
  // 세 훅을 항상 모두 호출하고 결과만 고른다 — 훅을 조건부로 부르면 rules-of-hooks 위반이고,
  // 같은 컴포넌트를 같은 자리에 두고 훅만 갈아끼우면 라우트 이동 시 React가 인스턴스를
  // 재사용해서 "훅 순서가 바뀌었다" 에러가 난다. 둘 다 유지하면 각 모드의 대화 상태도
  // 페이지를 오가도 안 사라진다.
  const defaultChat = useChatMessages();
  const readingChat = useReadingChatMessages();
  const postsChat = usePostsChatMessages();
  const chat = isReadingRoute ? readingChat : isPostsRoute ? postsChat : defaultChat;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {nav}
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <DesktopChatPanel chat={chat} />
      <ChatDock chat={chat} />
    </div>
  );
}
