import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export default function PostAccessDenied() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-2 text-2xl font-bold">조회할 수 없는 게시물입니다</h1>
      <p className="mb-6 text-sm text-zinc-500">
        삭제되었거나, 본인이 작성한 글이 아닐 수 있어요.
      </p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        홈으로 가기
      </Link>
    </div>
  );
}
