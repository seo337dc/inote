import { toPageNumber } from "@/shared/lib/pageParam";
import { HomePage } from "@/views/home";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const category =
    typeof searchParams.category === "string" ? searchParams.category : null;

  const page = toPageNumber(searchParams.page);
  const pinnedPage = toPageNumber(searchParams.pinnedPage);

  return <HomePage category={category} page={page} pinnedPage={pinnedPage} />;
}
