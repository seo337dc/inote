import { redirect } from "next/navigation";
import { toPageNumber, toSearchQuery } from "@/shared/lib/pageParam";
import { HomePage } from "@/views/home";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  // 전체 글에는 카테고리 필터가 없다 — 주소에 category가 붙어 있으면(예전 링크·북마크) 그것만 떼고 검색어·페이지는 그대로 둔 채 이동
  if ("category" in searchParams) {
    const rest = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "category" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) rest.append(key, v);
    }
    redirect(rest.size > 0 ? `/?${rest}` : "/");
  }

  const page = toPageNumber(searchParams.page);
  const pinnedPage = toPageNumber(searchParams.pinnedPage);
  const q = toSearchQuery(searchParams.q);

  return <HomePage page={page} pinnedPage={pinnedPage} q={q} />;
}
