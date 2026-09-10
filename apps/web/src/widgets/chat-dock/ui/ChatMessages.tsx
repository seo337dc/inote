import type { ChatMessage } from "../model/types";

type Props = {
  messages: ChatMessage[];
};

export default function ChatMessages({ messages }: Props) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <p
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {m.text}
          </p>
        </div>
      ))}
    </div>
  );
}
