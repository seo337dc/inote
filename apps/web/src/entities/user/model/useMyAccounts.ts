"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/shared/lib/auth-client";
import { getMyAccounts } from "../api/getMyAccounts";

export const MY_ACCOUNTS_QUERY_KEY = ["my-accounts"];

// better-auth 내장 /list-accounts — 현재 로그인한 유저에게 연결된 로그인 수단
// (credential/google 등) 목록. 세션 쿠키 인증이라 로그인한 본인 것만 조회됨.
export function useMyAccounts() {
  const { data: session, isPending: isSessionPending } = useSession();
  return useQuery({
    queryKey: MY_ACCOUNTS_QUERY_KEY,
    queryFn: getMyAccounts,
    enabled: !isSessionPending && Boolean(session),
  });
}
