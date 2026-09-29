import { WritePage } from "@/views/write";

export default async function Page(props: PageProps<"/write/[id]">) {
  const { id } = await props.params;

  return <WritePage id={id} />;
}
