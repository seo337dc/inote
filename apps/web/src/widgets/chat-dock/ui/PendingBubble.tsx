// 답변을 기다리는 동안 보여주는 "조회 중" 표시 — 답변이 오기 시작하면(글자가 생기면) 사라진다.
// 움직임을 줄이는 설정(prefers-reduced-motion)이면 점이 움직이지 않는다.
export default function PendingBubble() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex max-w-[85%] items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500"
    >
      <span>조회 중</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-zinc-400 motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
