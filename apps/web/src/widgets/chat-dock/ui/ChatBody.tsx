import ChatMessages from "./ChatMessages";
import ChatEmptyState from "./ChatEmptyState";
import type { useChatMessages } from "../model/useChatMessages";

type Props = {
  chat: ReturnType<typeof useChatMessages>;
};

export default function ChatBody({ chat }: Props) {
  if (chat.messages.length === 0) {
    return <ChatEmptyState onSelect={chat.sendPreset} />;
  }
  return <ChatMessages messages={chat.messages} />;
}
