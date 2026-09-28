import { ReadingLogDetailPage } from "@/views/reading-detail";

export default async function Page(props: PageProps<"/reading/[id]">) {
  const { id } = await props.params;
  return <ReadingLogDetailPage id={id} />;
}
