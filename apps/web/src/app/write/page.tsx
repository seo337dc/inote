import { WritePage } from "@/views/write";

export default async function Page(props: PageProps<"/write">) {
  const searchParams = await props.searchParams;
  const id = typeof searchParams.id === "string" ? searchParams.id : null;

  return <WritePage id={id} />;
}
