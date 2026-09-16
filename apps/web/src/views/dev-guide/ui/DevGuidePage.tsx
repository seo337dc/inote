import type { MandalartItem } from "@/entities/mandalart";
import { api } from "@/shared/lib/api";
import { MandalartGrid } from "@/widgets/mandalart-grid";

export default async function DevGuidePage() {
  const items = await api.get<MandalartItem[]>("/mandalart", { cache: "no-store" });
  return <MandalartGrid items={items} />;
}
