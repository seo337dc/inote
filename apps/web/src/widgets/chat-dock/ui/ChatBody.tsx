import ChatMessages from "./ChatMessages";
import ChatEmptyState from "./ChatEmptyState";
import type { useChatMessages } from "../model/useChatMessages";

type Props = {
  chat: ReturnType<typeof useChatMessages>;
  onNavigate?: () => void;
};

export default function ChatBody({ chat, onNavigate }: Props) {
  if (chat.messages.length === 0) {
    return <ChatEmptyState onSelect={chat.sendPreset} suggestions={chat.suggestions} />;
  }
  return <ChatMessages messages={chat.messages} onNavigate={onNavigate} />;
}
