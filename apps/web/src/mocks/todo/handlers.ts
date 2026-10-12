import { http, HttpResponse } from "msw";
import type { AddEntryInput } from "@/entities/daily";
import type { TodoStore } from "./store";

// 호스트는 와일드카드라서 테스트(localhost:3200)와 브라우저 개발(NEXT_PUBLIC_API_URL) 둘 다 잡는다.
const BASE = "*/api/v1";

const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 });
const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 });

export function createTodoHandlers(store: TodoStore) {
  return [
    http.get(`${BASE}/daily/:date`, ({ params }) => HttpResponse.json(store.getDay(String(params.date)))),

    http.get(`${BASE}/daily`, ({ request }) => {
      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      return HttpResponse.json(store.history(url.searchParams.get("before"), limit));
    }),

    http.post(`${BASE}/daily/entries`, async ({ request }) => {
      const body = (await request.json()) as Partial<AddEntryInput>;
      const title = body.title?.trim();
      if (!title) return badRequest("제목을 입력하세요.");
      return HttpResponse.json(store.addEntry({ title }), { status: 201 });
    }),

    http.patch(`${BASE}/daily/entries/:id`, async ({ request, params }) => {
      const body = (await request.json()) as { done?: boolean; title?: string };
      const entry = store.patchEntry(String(params.id), body);
      return entry ? HttpResponse.json(entry) : notFound("항목을 찾을 수 없습니다.");
    }),

    http.post(`${BASE}/routines`, async ({ request }) => {
      const body = (await request.json()) as { entryId?: string };
      if (!body.entryId) return badRequest("entryId가 필요합니다.");
      const routine = store.makeRoutine(body.entryId);
      return routine
        ? HttpResponse.json(routine, { status: 201 })
        : badRequest("오늘의 그날 항목만 매일 반복으로 만들 수 있습니다.");
    }),

    http.patch(`${BASE}/routines/:id`, async ({ request, params }) => {
      const body = (await request.json()) as { title?: string };
      const title = body.title?.trim();
      if (!title) return badRequest("제목을 입력하세요.");
      const routine = store.renameRoutine(String(params.id), title);
      return routine ? HttpResponse.json(routine) : notFound("루틴을 찾을 수 없습니다.");
    }),

    http.delete(`${BASE}/routines/:id`, ({ params }) =>
      store.deleteRoutine(String(params.id)) ? new HttpResponse(null, { status: 204 }) : notFound("루틴을 찾을 수 없습니다."),
    ),
  ];
}
