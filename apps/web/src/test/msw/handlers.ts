import { http, HttpResponse } from "msw";

// 테스트에서 실제로 쓰는 API_URL. vitest.setup.ts에서 NEXT_PUBLIC_API_URL로 고정 주입함.
export const TEST_API_URL = "http://localhost:3200";

// 기본(해피패스) 핸들러 — 테스트별로 다른 상황(빈 목록, 에러, 경계값 등)이 필요하면
// 개별 테스트에서 server.use(...)로 덮어쓴다.
export const handlers = [
  http.get(`${TEST_API_URL}/api/v1/admin/users`, () => {
    return HttpResponse.json({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  }),
];
