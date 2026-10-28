import Link from "next/link";

type Props = { archived: boolean };

// 나의 글 ↔ 보관함 전환. 보관함은 같은 화면을 보관한 글만으로 보여주는 /my-posts/archive 경로다.
export default function MyPostsTabs({ archived }: Props) {
  const base = "border-b-2 px-1 pb-2 text-sm";
  const active = "border-zinc-900 font-semibold text-zinc-900";
  const idle = "border-transparent text-zinc-400 hover:text-zinc-600";
  return (
    <nav aria-label="나의 글 보기" className="flex gap-4">
      <Link href="/my-posts" aria-current={archived ? undefined : "page"} className={`${base} ${archived ? idle : active}`}>
        나의 글
      </Link>
      <Link
        href="/my-posts/archive"
        aria-current={archived ? "page" : undefined}
        className={`${base} ${archived ? active : idle}`}
      >
        보관함
      </Link>
    </nav>
  );
}
