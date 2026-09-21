"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/shared/lib/auth-client";
import { PageLoading } from "@/shared/ui/page-loading";

const ADMIN_NAV = [{ href: "/admin/members", label: "회원 정보" }];

// 실제 권한은 서버가 강제하지 않음(관리자 전용 API가 아직 없음) — 지금은 화면 접근만 막는
// 클라이언트 가드. 관리자 전용 API가 생기면 그쪽에서도 role 검증을 반드시 추가할 것.
// /admin 아래 페이지들의 공통 레이아웃 — 사이드바 + 이 가드를 여기 한 곳에서 관리.
// /admin/forbidden은 이 레이아웃 밖(route group 밖)에 있어서 가드 대상이 아님 —
// 여기 포함하면 비관리자가 forbidden으로 쫓겨나자마자 다시 튕겨나가는 루프가 됨.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="mx-auto flex max-w-5xl gap-8 px-6 py-10">
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm ${
                pathname === item.href
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
