import { toPageNumber, toSearchQuery } from "@/shared/lib/pageParam";
import { MyPostsPage } from "@/views/my-posts";

// 보관함 — 나의 글과 같은 화면을 보관한 글만으로 본다 (docs/adr/0007-archive-posts.md)
export default async function Page(props: PageProps<"/my-posts/archive">) {
  const searchParams = await props.searchParams;
  const categoryId =
    typeof searchParams.categoryId === "string" && searchParams.categoryId ? searchParams.categoryId : null;

  const page = toPageNumber(searchParams.page);
  const pinnedPage = toPageNumber(searchParams.pinnedPage);
  const q = toSearchQuery(searchParams.q);

  return <MyPostsPage categoryId={categoryId} page={page} pinnedPage={pinnedPage} q={q} archived />;
}
