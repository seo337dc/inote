import { toPageNumber, toSearchQuery } from "@/shared/lib/pageParam";
import { MyPostsPage } from "@/views/my-posts";

export default async function Page(props: PageProps<"/my-posts">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  const page = toPageNumber(searchParams.page);
  const pinnedPage = toPageNumber(searchParams.pinnedPage);
  const q = toSearchQuery(searchParams.q);

  return <MyPostsPage category={category} page={page} pinnedPage={pinnedPage} q={q} />;
}
