import Link from "next/link";

export default function PostListEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <p className="text-lg font-semibold">아직 작성하신 글이 없어요.</p>
      <p className="text-sm text-zinc-500">내 블로그의 첫 시작이 될 오늘의 기록을 남겨보세요!</p>
      <Link
        href="/write"
        className="mt-4 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        글쓰기
      </Link>
    </div>
  );
}
