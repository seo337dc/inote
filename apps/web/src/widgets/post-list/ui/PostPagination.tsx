import Link from "next/link";
import { cn } from "@/shared/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  category: string | null;
};

function hrefFor(basePath: string, page: number, category: string | null) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const buttonClass =
  "rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50";

export default function PostPagination({ page, totalPages, basePath, category }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지 이동" className="mt-6 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(basePath, page - 1, category)} className={buttonClass}>
          이전
        </Link>
      ) : (
        <span className={cn(buttonClass, "pointer-events-none opacity-40")}>이전</span>
      )}
      <span className="text-sm text-zinc-500">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(basePath, page + 1, category)} className={buttonClass}>
          다음
        </Link>
      ) : (
        <span className={cn(buttonClass, "pointer-events-none opacity-40")}>다음</span>
      )}
    </nav>
  );
}
