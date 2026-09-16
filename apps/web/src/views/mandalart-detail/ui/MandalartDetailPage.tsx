import { notFound } from "next/navigation";
import Link from "next/link";
import type { MandalartItem } from "@/entities/mandalart";
import { api, ApiError } from "@/shared/lib/api";
import MandalartContent from "./MandalartContent";

type Props = {
  id: string;
};

export default async function MandalartDetailPage({ id }: Props) {
  let item: MandalartItem;
  try {
    item = await api.get<MandalartItem>(`/mandalart/${id}`, { cache: "no-store" });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/dev-guide" className="mb-6 inline-block text-sm text-zinc-400 hover:text-zinc-600">
        ← 만다라트로 돌아가기
      </Link>
      <div className="mb-3">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400">
          {item.themeName}
        </span>
      </div>
      <h1 className="mb-8 text-2xl font-bold">{item.title}</h1>
      <MandalartContent item={item} />
    </article>
  );
}
