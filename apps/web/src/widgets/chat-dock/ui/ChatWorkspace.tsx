"use client";

import { usePathname } from "next/navigation";
import ChatDock from "./ChatDock";
import DesktopChatPanel from "./DesktopChatPanel";
import { useChatMessages } from "../model/useChatMessages";
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

  // 독서 관련 페이지(/reading, /reading/write, /reading/[id])에서는 채팅 도크가
  // "독서 상담" 모드(대화 저장 없음, /reading-chat/stream)로 동작하고, 그 외에는
  // 기존 글쓰기/일반 모드 그대로 유지. 두 훅을 한 컴포넌트에서 조건부로 호출하면
  // rules-of-hooks에 걸려서, 아예 컴포넌트를 갈라 각자 자기 훅만 부르게 함.
  return isReadingRoute ? (
    <ChatWorkspaceInner nav={nav} useChat={useReadingChatMessages}>
      {children}
    </ChatWorkspaceInner>
  ) : (
    <ChatWorkspaceInner nav={nav} useChat={useChatMessages}>
      {children}
    </ChatWorkspaceInner>
  );
}

type InnerProps = Props & {
  useChat: typeof useChatMessages | typeof useReadingChatMessages;
};

function ChatWorkspaceInner({ nav, children, useChat }: InnerProps) {
  const chat = useChat();

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
