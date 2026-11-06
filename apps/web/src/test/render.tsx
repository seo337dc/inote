import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";

// MSW로 실제 네트워크 요청을 태우는 테스트용 — react-query가 자동 재시도로
// 실패 케이스 테스트를 느리게/불안정하게 만들지 않도록 retry를 꺼둔다.
// 캐시를 미리 채우거나(setQueryData) invalidateQueries를 지켜봐야 하는 테스트는 이걸로 client를 먼저 만들어서 넘긴다.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/** 훅 테스트용: QueryClientProvider로 감싸서 renderHook한다. client를 넘기지 않으면 새로 만든다. */
export function renderHookWithQueryClient<T>(
  callback: () => T,
  client: QueryClient = createTestQueryClient(),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(callback, { wrapper });
}
