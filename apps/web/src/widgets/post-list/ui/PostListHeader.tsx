import Link from "next/link";
import PostSearchForm from "./PostSearchForm";

type Props = {
  title: string;
  count: number;
  // 검색이 보낼 주소와 지금 걸려 있는 카테고리·검색어 (홈은 전체 공개 글, 나의 글은 내 글만 검색)
  basePath: string;
  category: string | null;
  q: string | null;
};

// 왼쪽: 제목·개수·글쓰기 / 오른쪽: 검색. 좁은 화면에서는 검색이 아래 줄로 내려간다.
export default function PostListHeader({ title, count, basePath, category, q }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-xl font-bold">{title}</h1>
          <span className="text-xl font-bold text-red-500">{count}</span>
        </div>
        <Link
          href="/write"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
        >
          글쓰기
        </Link>
      </div>
      <PostSearchForm basePath={basePath} category={category} q={q} />
    </div>
  );
}
