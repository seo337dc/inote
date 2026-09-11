"use client";

import ChatDock from "./ChatDock";
import DesktopChatPanel from "./DesktopChatPanel";
import { useChatMessages } from "../model/useChatMessages";

type Props = {
  nav: React.ReactNode;
  children: React.ReactNode;
};

// AI 패널이 헤더 옆에서부터 화면 전체 높이로 이어지도록,
// (헤더+본문)을 한 세로 컬럼으로 묶고 그 옆에 AI 패널을 나란히 둔다.
//   header | llm
//   main   | llm
export default function ChatWorkspace({ nav, children }: Props) {
  const chat = useChatMessages();

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
