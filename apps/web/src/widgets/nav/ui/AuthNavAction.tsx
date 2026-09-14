"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, CircleUserRound } from "lucide-react";
import { authClient, useSession } from "@/shared/lib/auth-client";
import { PageLoading } from "@/shared/ui/page-loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type Props = {
  className?: string;
  onNavigate?: () => void;
  // 모바일 nav sheet 안에서는 드롭다운을 열면 sheet의 오버레이/포털에 가려서 안 보임 —
  // 그 경우 별도 팝업 없이 항목을 그대로 나열(inline)한다. 데스크톱은 드롭다운으로.
  variant?: "dropdown" | "inline";
};

export default function AuthNavAction({ className, onNavigate, variant = "dropdown" }: Props) {
  const { data: session, isPending } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  // useSession()은 서버에서 로그인 여부를 알 방법이 없어 서버 렌더링과 클라이언트의
  // 첫 렌더링에서 isPending 값이 서로 다르게 시작함 — 마운트 전엔 서버와 똑같이
  // 아무것도 렌더링하지 않아야 하이드레이션 불일치가 안 생김.
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted || isPending) return null;

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

  const displayName = session.user.name || session.user.email;

  if (variant === "inline") {
    return (
      <>
        {loggingOut && (
          <div className="fixed inset-0 z-50 bg-white">
            <PageLoading />
          </div>
        )}
        <div className="mt-2 border-t border-zinc-200 pt-2">
          <p className="truncate px-3 py-1 text-xs text-zinc-400">{displayName}</p>
          <Link
            href="/profile"
            onClick={onNavigate}
            className="block rounded px-3 py-2 text-left text-zinc-600 hover:bg-zinc-100"
          >
            내 정보 보기
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="block w-full rounded px-3 py-2 text-left text-zinc-600 hover:bg-zinc-100"
          >
            로그아웃
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {loggingOut && (
        <div className="fixed inset-0 z-50 bg-white">
          <PageLoading />
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger className={`flex items-center gap-1.5 ${className ?? ""}`}>
          <CircleUserRound className="size-4 shrink-0 text-zinc-400" />
          <span className="max-w-32 truncate">{displayName} 님</span>
          <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem render={<Link href="/profile" onClick={onNavigate} />}>
            내 정보 보기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
