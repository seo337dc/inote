"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/shared/lib/auth-client";
import { api } from "@/shared/lib/api";

// 이메일/비밀번호, 구글, 테스트 계정 등 로그인 방법과 무관하게 — 세션이 잡히면
// usesInote를 true로 보고함(AUTH_POLICY.md 3번, inote에서 직접 가입/로그인한 케이스).
// 구글 로그인은 리다이렉트로 돌아와서 "방금 로그인했다"는 이벤트를 따로 잡기 애매해서,
// 대신 세션이 있을 때 한 번(유저가 바뀌면 다시) 호출하는 방식으로 모든 로그인 경로를 커버.
// 이미 true인 계정도 다시 호출은 되지만 서버에서 단순 덮어쓰기라 문제없음.
export default function MarkInoteUsed() {
  const { data: session } = useSession();
  const markedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!session || markedForUserId.current === session.user.id) return;
    markedForUserId.current = session.user.id;
    api.patch("/users/me", { usesInote: true }).catch(() => {
      markedForUserId.current = null;
    });
  }, [session]);

  return null;
}
