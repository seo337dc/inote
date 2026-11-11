import Link from "next/link";

export type MyPostsTab = "posts" | "drafts" | "archive";

type Props = { current: MyPostsTab };

const TABS: { key: MyPostsTab; label: string; href: string }[] = [
  { key: "posts", label: "나의 글", href: "/my-posts" },
  { key: "drafts", label: "임시저장", href: "/my-posts/drafts" },
  { key: "archive", label: "보관함", href: "/my-posts/archive" },
];

// 나의 글 ↔ 임시저장 ↔ 보관함 전환. 보관함·임시저장은 /my-posts 아래 별도 경로다
// (보관함은 같은 화면을 보관한 글만으로, 임시저장은 MyDraftsPage가 발행 전 글만 따로 보여준다).
export default function MyPostsTabs({ current }: Props) {
  const base = "border-b-2 px-1 pb-2 text-sm";
  const active = "border-zinc-900 font-semibold text-zinc-900";
  const idle = "border-transparent text-zinc-400 hover:text-zinc-600";
  return (
    <nav aria-label="나의 글 보기" className="flex gap-4">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={`${base} ${tab.key === current ? active : idle}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
