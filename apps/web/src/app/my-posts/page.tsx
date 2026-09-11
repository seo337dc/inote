import { MyPostsPage } from "@/views/my-posts";

export default async function Page(props: PageProps<"/my-posts">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  return <MyPostsPage category={category} />;
}
