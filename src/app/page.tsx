import { HomePage } from "@/views/home";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  return <HomePage category={category} />;
}
