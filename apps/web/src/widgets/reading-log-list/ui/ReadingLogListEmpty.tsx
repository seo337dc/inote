import Link from "next/link";

export default function ReadingLogListEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <p className="text-lg font-semibold">아직 기록한 책이 없어요.</p>
      <p className="text-sm text-zinc-500">지금 읽고 있는 책부터 기록해보세요!</p>
      <Link
        href="/reading/write"
        className="mt-4 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        기록하기
      </Link>
    </div>
  );
}
