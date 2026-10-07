import { toPageNumber, toSearchQuery } from "@/shared/lib/pageParam";
import { UserPostsPage } from "@/views/user-posts";

export default async function Page(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const category = typeof searchParams.category === "string" && searchParams.category ? searchParams.category : null;

  return (
    <UserPostsPage
      userId={id}
      category={category}
      page={toPageNumber(searchParams.page)}
      pinnedPage={toPageNumber(searchParams.pinnedPage)}
      q={toSearchQuery(searchParams.q)}
    />
  );
}
