import Form from "next/form";
import { Search } from "lucide-react";
import { SEARCH_QUERY_MAX } from "@/shared/lib/pageParam";

type Props = {
  basePath: string;
  category: string | null;
  q: string | null;
};

// 제목+본문 검색. 제출하면 basePath?category=…&q=… 로 이동한다 (page는 빠지니 1페이지부터).
// 선택한 카테고리는 숨은 값으로 같이 보내서 "그 카테고리 안에서" 검색한다.
export default function PostSearchForm({ basePath, category, q }: Props) {
  return (
    <Form action={basePath} role="search" className="flex items-center gap-1.5">
      {category && <input type="hidden" name="category" value={category} />}
      <input
        // 주소의 q가 바뀌면(뒤로가기 등) 입력칸도 그 값으로 다시 맞춘다
        key={q ?? ""}
        name="q"
        type="search"
        defaultValue={q ?? ""}
        maxLength={SEARCH_QUERY_MAX}
        placeholder="제목·본문 검색"
        aria-label="글 검색"
        className="w-40 rounded border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-zinc-400 sm:w-56"
      />
      <button
        type="submit"
        className="flex items-center gap-1 rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        <Search aria-hidden className="size-3.5" />
        검색
      </button>
    </Form>
  );
}
