"use client";

import { useEffect, useState } from "react";

// 개발용 — `NEXT_PUBLIC_API_MOCKING=true pnpm dev`로 켜면 할일 API를 가짜 서버(MSW)가 대신 받는다.
// 운영 빌드(NODE_ENV=production)에서는 값이 있어도 무시된다. 워커가 뜨기 전에 요청이 나가지 않도록 그동안은 그리지 않는다.
const ENABLED = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_API_MOCKING === "true";

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!ENABLED);

  useEffect(() => {
    if (!ENABLED) return;
    import("@/mocks/todo/browser")
      .then(({ startMockWorker }) => startMockWorker())
      .then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
