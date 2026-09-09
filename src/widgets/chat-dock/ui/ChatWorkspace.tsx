"use client";

import ChatDock from "./ChatDock";
import DesktopChatPanel from "./DesktopChatPanel";
import { useChatMessages } from "../model/useChatMessages";

type Props = {
  children: React.ReactNode;
};

export default function ChatWorkspace({ children }: Props) {
  const chat = useChatMessages();

  return (
    <div className="flex min-h-0 flex-1">
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      <DesktopChatPanel chat={chat} />
      <ChatDock chat={chat} />
    </div>
  );
}
