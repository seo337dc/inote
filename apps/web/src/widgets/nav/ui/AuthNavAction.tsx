"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient, useSession } from "@/shared/lib/auth-client";
import { PageLoading } from "@/shared/ui/page-loading";

type Props = {
  className?: string;
  onNavigate?: () => void;
};

export default function AuthNavAction({ className, onNavigate }: Props) {
  const { data: session, isPending } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  if (isPending) return null;

  if (!session) {
    return (
      <Link href="/login" onClick={onNavigate} className={className}>
        로그인
      </Link>
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    onNavigate?.();
    await authClient.signOut();
    // 클라이언트 세션 캐시가 새 페이지에 아직 반영 안 된 상태로 이동하면
    // 로그인된 걸로 오인해 다시 홈으로 튕기는 레이스가 있어서, router.push 대신
    // 완전한 페이지 이동으로 캐시를 확실히 비우고 이동한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-50 bg-white">
          <PageLoading />
        </div>
      )}
      <button type="button" onClick={handleLogout} disabled={loggingOut} className={className}>
        로그아웃
      </button>
    </>
  );
}
