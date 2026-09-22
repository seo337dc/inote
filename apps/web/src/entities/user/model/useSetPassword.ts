"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setPassword } from "../api/setPassword";
import { MY_ACCOUNTS_QUERY_KEY } from "./useMyAccounts";

export function useSetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPassword,
    onSuccess: () => {
      // 비밀번호가 생겼으니 credential 계정이 목록에 새로 잡힘 — 다시 조회해서
      // "비밀번호 생성" 버튼이 사라지게 함.
      queryClient.invalidateQueries({ queryKey: MY_ACCOUNTS_QUERY_KEY });
    },
  });
}
