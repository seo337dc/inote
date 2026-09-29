import { MyPostsPage } from "@/views/my-posts";

export default async function Page(props: PageProps<"/my-posts">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);

  return <MyPostsPage category={category} page={page} />;
}
