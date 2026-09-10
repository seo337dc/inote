"use client";

import { useLoginForm } from "../model/useLoginForm";
import LoginDesktop from "./desktop/LoginDesktop";
import LoginMobile from "./mobile/LoginMobile";

export default function LoginPage() {
  const form = useLoginForm();

  return (
    <>
      <div className="hidden lg:block">
        <LoginDesktop form={form} />
      </div>
      <div className="block lg:hidden">
        <LoginMobile form={form} />
      </div>
    </>
  );
}
