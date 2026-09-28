import { ReadingWritePage } from "@/views/reading-write";

export default async function Page(props: PageProps<"/reading/write">) {
  const searchParams = await props.searchParams;
  const id = typeof searchParams.id === "string" ? searchParams.id : null;

  return <ReadingWritePage id={id} />;
}
