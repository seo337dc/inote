import Link from "next/link";

type Props = {
  title: string;
  count: number;
};

export default function PostListHeader({ title, count }: Props) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-1.5 border-b border-zinc-200 pb-3">
      <div className="flex items-baseline gap-1.5">
        <h1 className="text-xl font-bold">{title}</h1>
        <span className="text-xl font-bold text-red-500">{count}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/categories" className="text-sm text-zinc-500 hover:text-zinc-700">
          카테고리
        </Link>
        <Link
          href="/write"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
        >
          글쓰기
        </Link>
      </div>
    </div>
  );
}
