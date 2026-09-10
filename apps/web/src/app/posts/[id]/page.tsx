import { PostDetailPage } from "@/views/post-detail";

export default async function Page(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;
  return <PostDetailPage id={id} />;
}
