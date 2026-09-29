import { redirect } from "next/navigation";
import { WritePage } from "@/views/write";

export default async function Page(props: PageProps<"/write">) {
  const searchParams = await props.searchParams;

  // 예전 주소(/write?id=…)로 저장해 둔 링크·북마크는 새 주소(/write/…)로 보낸다
  if (typeof searchParams.id === "string" && searchParams.id) {
    redirect(`/write/${encodeURIComponent(searchParams.id)}`);
  }

  return <WritePage id={null} />;
}
