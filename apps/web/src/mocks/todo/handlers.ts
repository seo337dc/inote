import { http, HttpResponse } from "msw";
import type { AddEntryInput } from "@/entities/daily";
import type { TaskStatus } from "@/shared/lib/task-status";
import { TASK_STATUSES } from "@/shared/lib/task-status";
import type { TodoStore } from "./store";

// 호스트는 와일드카드라서 테스트(localhost:3200)와 브라우저 개발(NEXT_PUBLIC_API_URL) 둘 다 잡는다.
const BASE = "*/api/v1";

const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 });
const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 });

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SCHEDULE_RULE_MESSAGE = "일정은 없음 / 시작일만 / 시작일~종료일만 가능해요. 종료일은 시작일 이후여야 하고, 시작일 없이 종료일만 둘 수 없어요.";
const isDateOrNull = (value: unknown): boolean => value === null || (typeof value === "string" && DATE_PATTERN.test(value));
const GROUP_NAME_MAX = 50;
const TASK_TITLE_MAX = 200;

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
    // ── 할 일 탭 ──

    http.get(`${BASE}/task-groups`, () => HttpResponse.json(store.listGroups())),

    http.post(`${BASE}/task-groups`, async ({ request }) => {
      const body = (await request.json()) as { name?: string };
      const name = body.name?.trim();
      if (!name) return badRequest("묶음 이름을 입력하세요.");
      if (name.length > GROUP_NAME_MAX) return badRequest("묶음 이름은 50자까지 쓸 수 있어요.");
      return HttpResponse.json(store.createGroup(name), { status: 201 });
    }),

    http.patch(`${BASE}/task-groups/:id`, async ({ request, params }) => {
      const body = (await request.json()) as { name?: string; starred?: boolean };
      const name = body.name?.trim();
      if (body.name !== undefined) {
        if (!name) return badRequest("묶음 이름을 입력하세요.");
        if (name.length > GROUP_NAME_MAX) return badRequest("묶음 이름은 50자까지 쓸 수 있어요.");
      }
      if (body.starred !== undefined && typeof body.starred !== "boolean") return badRequest("starred는 true/false여야 합니다.");
      const group = store.patchGroup(String(params.id), { name, starred: body.starred });
      return group ? HttpResponse.json(group) : notFound("묶음을 찾을 수 없습니다.");
    }),

    http.delete(`${BASE}/task-groups/:id`, ({ params }) =>
      store.deleteGroup(String(params.id)) ? new HttpResponse(null, { status: 204 }) : notFound("묶음을 찾을 수 없습니다."),
    ),

    http.post(`${BASE}/task-groups/:id/tasks`, async ({ request, params }) => {
      const body = (await request.json()) as { title?: string; startDate?: string | null; endDate?: string | null };
      const title = body.title?.trim();
      if (!title) return badRequest("작업 제목을 입력하세요.");
      if (title.length > TASK_TITLE_MAX) return badRequest("작업 제목은 200자까지 쓸 수 있어요.");
      const startDate = body.startDate ?? null;
      const endDate = body.endDate ?? null;
      if (!isDateOrNull(startDate) || !isDateOrNull(endDate)) return badRequest("날짜는 YYYY-MM-DD 형식이어야 해요.");
      const result = store.createTask(String(params.id), { title, startDate, endDate });
      if (result.ok) return HttpResponse.json(result.task, { status: 201 });
      return result.reason === "no-group" ? notFound("묶음을 찾을 수 없습니다.") : badRequest(SCHEDULE_RULE_MESSAGE);
    }),

    http.put(`${BASE}/task-groups/:id/tasks/order`, async ({ request, params }) => {
      const body = (await request.json()) as { taskIds?: unknown };
      if (!Array.isArray(body.taskIds) || !body.taskIds.every((id) => typeof id === "string")) {
        return badRequest("taskIds가 필요합니다.");
      }
      const result = store.reorderTasks(String(params.id), body.taskIds as string[]);
      if (result === "no-group") return notFound("묶음을 찾을 수 없습니다.");
      if (result === "mismatch") return badRequest("묶음의 작업 전체를 한 번씩 넣어야 합니다.");
      return new HttpResponse(null, { status: 204 });
    }),

    http.patch(`${BASE}/tasks/:id`, async ({ request, params }) => {
      const body = (await request.json()) as {
        title?: string;
        startDate?: string | null;
        endDate?: string | null;
        status?: TaskStatus;
        starred?: boolean;
      };
      if (body.title !== undefined && !body.title.trim()) return badRequest("작업 제목을 입력하세요.");
      if (body.startDate !== undefined && !isDateOrNull(body.startDate)) return badRequest("날짜는 YYYY-MM-DD 형식이어야 해요.");
      if (body.endDate !== undefined && !isDateOrNull(body.endDate)) return badRequest("날짜는 YYYY-MM-DD 형식이어야 해요.");
      if (body.status !== undefined && !TASK_STATUSES.includes(body.status)) return badRequest("올바르지 않은 상태입니다.");
      if (body.starred !== undefined && typeof body.starred !== "boolean") return badRequest("starred는 true/false여야 합니다.");
      const result = store.patchTask(String(params.id), { ...body, title: body.title?.trim() });
      if (result.ok) return HttpResponse.json(result.task);
      return result.reason === "not-found" ? notFound("작업을 찾을 수 없습니다.") : badRequest(SCHEDULE_RULE_MESSAGE);
    }),

    http.delete(`${BASE}/tasks/:id`, ({ params }) =>
      store.deleteTask(String(params.id)) ? new HttpResponse(null, { status: 204 }) : notFound("작업을 찾을 수 없습니다."),
    ),
  ];
}
