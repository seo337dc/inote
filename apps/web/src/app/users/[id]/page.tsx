import { toPageNumber, toSearchQuery } from "@/shared/lib/pageParam";
import { UserPostsPage } from "@/views/user-posts";

export default async function Page(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  return (
    <UserPostsPage
      userId={id}
      page={toPageNumber(searchParams.page)}
      pinnedPage={toPageNumber(searchParams.pinnedPage)}
      q={toSearchQuery(searchParams.q)}
    />
  );
}
