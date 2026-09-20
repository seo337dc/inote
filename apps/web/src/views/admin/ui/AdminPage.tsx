"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/shared/lib/auth-client";
import { PageLoading } from "@/shared/ui/page-loading";

// 실제 권한은 서버가 강제하지 않음(관리자 전용 API가 아직 없음) — 지금은 화면 접근만 막는
// 클라이언트 가드. 관리자 전용 API가 생기면 그쪽에서도 role 검증을 반드시 추가할 것.
export default function AdminPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      toast.error("관리자 전용 페이지입니다.");
      router.replace("/admin/forbidden");
    }
  }, [session, isPending, isAdmin, router]);

  if (isPending || !session || !isAdmin) return <PageLoading />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">관리자 페이지</h1>
      <p className="text-sm text-zinc-500">준비 중입니다.</p>
    </div>
  );
}
