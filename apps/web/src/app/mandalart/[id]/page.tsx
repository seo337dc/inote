import { MandalartDetailPage } from "@/views/mandalart-detail";

export default async function Page(props: PageProps<"/mandalart/[id]">) {
  const { id } = await props.params;
  return <MandalartDetailPage id={id} />;
}
