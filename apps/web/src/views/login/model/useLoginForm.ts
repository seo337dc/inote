"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient, useSession } from "@/shared/lib/auth-client";
import {
  translateAuthError,
  getAuthErrorField,
  type AuthFormField,
} from "@/shared/lib/auth-errors";
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH } from "@/shared/lib/validation";

export type Mode = "idle" | "login" | "signup";

type FocusSignal = { field: AuthFormField; token: number };

export const DEMO_ACCOUNT = { email: "test@test.com", password: "test123!@" };

export function useLoginForm() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<Mode>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusSignal, setFocusSignal] = useState<FocusSignal | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/");
    }
  }, [session, isPending, router]);

  function requestFocus(field: AuthFormField) {
    setFocusSignal({ field, token: Date.now() });
  }

  function reset() {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setName("");
  }

  function goToIdle() {
    reset();
    setMode("idle");
  }

  function toggleMode() {
    reset();
    setMode(mode === "signup" ? "login" : "signup");
  }

  function handleGoogle() {
    authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  async function loginDemoAccount() {
    setMode("login");
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setSubmitting(true);

    const { error: authError } = await authClient.signIn.email({
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
    });

    setSubmitting(false);

    if (authError) {
      toast.error(translateAuthError(authError.code));
      return;
    }

    router.push("/");
  }

  function validate(): { field: AuthFormField; message: string } | null {
    if (mode === "signup" && !name.trim()) {
      return { field: "name", message: "이름을 입력해주세요." };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { field: "email", message: "올바른 이메일 형식이 아닙니다." };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        field: "password",
        message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
      };
    }
    if (mode === "signup" && password !== passwordConfirm) {
      return { field: "passwordConfirm", message: "비밀번호가 일치하지 않습니다." };
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      toast.error(validationError.message);
      requestFocus(validationError.field);
      return;
    }

    setSubmitting(true);

    const { error: authError } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: name.trim() })
        : await authClient.signIn.email({ email, password });

    setSubmitting(false);

    if (authError) {
      toast.error(translateAuthError(authError.code));
      const field = getAuthErrorField(authError.code);
      if (field) requestFocus(field);
      return;
    }

    router.push("/");
  }

  const passwordConfirmMismatch =
    mode === "signup" && passwordConfirm.length > 0 && password !== passwordConfirm;

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    name,
    setName,
    submitting,
    passwordConfirmMismatch,
    focusSignal,
    handleGoogle,
    handleSubmit,
    goToIdle,
    toggleMode,
    loginDemoAccount,
  };
}

export type LoginFormState = ReturnType<typeof useLoginForm>;
