import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

// MSW로 실제 네트워크 요청을 태우는 테스트용 — react-query가 자동 재시도로
// 실패 케이스 테스트를 느리게/불안정하게 만들지 않도록 retry를 꺼둔다.
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
