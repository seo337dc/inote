"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoryManager } from "@/features/manage-categories";
import { PageLoading } from "@/shared/ui/page-loading";
import { useSession } from "@/shared/lib/auth-client";

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  useEffect(() => {
    if (!isSessionPending && !session) {
      router.replace("/login");
    }
  }, [isSessionPending, session, router]);

  if (isSessionPending || !session) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">카테고리 관리</h1>
      <p className="mb-6 text-sm text-zinc-500">
        글을 나눌 카테고리를 확인하고 추가해요. 하위 카테고리는 최대 3단계까지 만들 수 있고, 숫자는 그 카테고리(하위 포함)의 글 수예요.
      </p>
      <CategoryManager />
    </div>
  );
}
