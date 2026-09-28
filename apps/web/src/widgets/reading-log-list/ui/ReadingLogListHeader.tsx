import Link from "next/link";

type Props = {
  count: number;
};

export default function ReadingLogListHeader({ count }: Props) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-1.5 border-b border-zinc-200 pb-3">
      <div className="flex items-baseline gap-1.5">
        <h1 className="text-xl font-bold">독서 기록</h1>
        <span className="text-xl font-bold text-red-500">{count}</span>
      </div>
      <Link
        href="/reading/write"
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
      >
        기록하기
      </Link>
    </div>
  );
}
