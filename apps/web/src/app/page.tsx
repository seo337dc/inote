import { HomePage } from "@/views/home";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  const page = Math.max(1, Math.floor(Number(searchParams.page)) || 1);

  return <HomePage category={category} page={page} />;
}
