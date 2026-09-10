"use client";

import { useEffect, useRef } from "react";
import type { AuthFormField } from "@/shared/lib/auth-errors";

type FocusSignal = { field: AuthFormField; token: number } | null;

// 에러 난 입력칸으로 자동 포커스 이동. PC/모바일 레이아웃이 동시에 마운트돼 있어도
// 숨겨진(display:none) 쪽 input은 focus()가 무시되므로, 실제로 보이는 쪽만 포커스된다.
export function useFieldRefs(focusSignal: FocusSignal) {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusSignal) return;
    const refMap = {
      name: nameRef,
      email: emailRef,
      password: passwordRef,
      passwordConfirm: passwordConfirmRef,
    } as const;
    refMap[focusSignal.field].current?.focus();
  }, [focusSignal]);

  return { nameRef, emailRef, passwordRef, passwordConfirmRef };
}
