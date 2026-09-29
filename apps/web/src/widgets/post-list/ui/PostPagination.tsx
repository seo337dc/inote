import Link from "next/link";
import { cn } from "@/shared/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  // 이 페이지네이션이 바꾸는 쿼리 파라미터 이름 ("page" | "pinnedPage")
  pageParam: string;
  // 페이지를 넘겨도 유지할 다른 쿼리 (카테고리, 다른 영역의 페이지 등). 값이 없으면(null/1) 주소에서 뺀다.
  keep: Record<string, string | number | null>;
  label: string;
};

function hrefFor(
  basePath: string,
  pageParam: string,
  page: number,
  keep: Props["keep"],
) {
  const params = new URLSearchParams();
  Object.entries(keep).forEach(([key, value]) => {
    if (value === null || value === "" || value === 1) return;
    params.set(key, String(value));
  });
  if (page > 1) params.set(pageParam, String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const buttonClass =
  "rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50";

// 페이지가 1개뿐이어도 "1 / 1"로 항상 보여준다 — 고정 글과 전체 글 영역이 어디서 끝나는지 구분되도록.
export default function PostPagination({
  page,
  totalPages,
  basePath,
  pageParam,
  keep,
  label,
}: Props) {
  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(basePath, pageParam, page - 1, keep)} className={buttonClass}>
          이전
        </Link>
      ) : (
        <span className={cn(buttonClass, "pointer-events-none opacity-40")}>이전</span>
      )}
      <span className="text-sm text-zinc-500">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(basePath, pageParam, page + 1, keep)} className={buttonClass}>
          다음
        </Link>
      ) : (
        <span className={cn(buttonClass, "pointer-events-none opacity-40")}>다음</span>
      )}
    </nav>
  );
}
