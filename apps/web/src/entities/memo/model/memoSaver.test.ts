import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { makeMemo as memo, MEMOS_URL as URL } from "@/test/fixtures/memo";
import { sleep } from "@/test/sleep";
import { MemoSaver } from "./memoSaver";
import type { Memo, MemoSaveStatus } from "./types";

const TARGET = { type: "post", id: "p1" } as const;
const DELAY = 20;

function setup(existing: Memo | null) {
  const writes: { method: string; id?: string; body: unknown }[] = [];
  const statuses: MemoSaveStatus[] = [];
  server.use(
    http.post(URL, async ({ request }) => {
      const body = await request.json();
      writes.push({ method: "POST", body });
      return HttpResponse.json(memo({ id: "new1" }), { status: 201 });
    }),
    http.patch(`${URL}/:id`, async ({ request, params }) => {
      const body = await request.json();
      writes.push({ method: "PATCH", id: String(params.id), body });
      return HttpResponse.json(memo());
    }),
  );
  const saver = new MemoSaver({ target: TARGET, memo: existing, delayMs: DELAY, onStatus: (s) => statuses.push(s) });
  return { saver, writes, statuses };
}

describe("MemoSaver — 제목·내용 (메모 한 장)", () => {
  it("바뀐 필드만 PATCH로 보낸다 — 제목만 고치면 content는 보내지 않는다", async () => {
    const { saver, writes } = setup(memo({ title: "옛 제목", content: "본문" }));
    saver.update({ title: "새 제목" });
    await sleep(DELAY * 4);
    expect(writes).toEqual([{ method: "PATCH", id: "m1", body: { title: "새 제목" } }]);
  });

  it("제목과 내용을 같이 고치면 디바운스 뒤 한 번에 보낸다", async () => {
    const { saver, writes } = setup(memo());
    saver.update({ title: "제목" });
    saver.update({ content: "내용" });
    await sleep(DELAY * 4);
    expect(writes).toEqual([{ method: "PATCH", id: "m1", body: { title: "제목", content: "내용" } }]);
  });

  it("서버에 없는 메모는 처음 한 번만 POST한다 — 제목만 있어도 만들고, 그다음은 PATCH", async () => {
    const { saver, writes } = setup(null);
    saver.update({ title: "첫 제목" });
    saver.flush();
    await sleep(DELAY * 3);
    saver.update({ content: "이어서" });
    saver.flush();
    await sleep(DELAY * 3);
    expect(writes).toEqual([
      { method: "POST", body: { targetType: "post", targetId: "p1", title: "첫 제목" } },
      { method: "PATCH", id: "new1", body: { content: "이어서" } },
    ]);
  });

  it("서버에 없고 제목·내용이 모두 비어 있으면 아무것도 보내지 않는다 (빈 행 방지)", async () => {
    const { saver, writes } = setup(null);
    saver.update({ title: "" });
    saver.update({ content: "" });
    saver.flush();
    await sleep(DELAY * 3);
    expect(writes).toEqual([]);
  });

  it("바뀐 게 없으면 flush해도 보내지 않는다", async () => {
    const { saver, writes } = setup(memo({ content: "그대로" }));
    saver.flush();
    await sleep(DELAY * 2);
    expect(writes).toEqual([]);
  });

  it("실패하면 error로 멈추고, 다음 flush에서 같은 변경을 다시 보낸다", async () => {
    const writes: unknown[] = [];
    let fail = true;
    server.use(
      http.patch(`${URL}/:id`, async ({ request }) => {
        if (fail) return HttpResponse.json({ message: "boom" }, { status: 500 });
        writes.push(await request.json());
        return HttpResponse.json(memo());
      }),
    );
    const statuses: MemoSaveStatus[] = [];
    const saver = new MemoSaver({ target: TARGET, memo: memo(), delayMs: DELAY, onStatus: (s) => statuses.push(s) });
    saver.update({ title: "재시도" });
    await sleep(DELAY * 4);
    expect(statuses.at(-1)).toBe("error");

    fail = false;
    saver.flush();
    await sleep(DELAY * 4);
    expect(writes).toEqual([{ title: "재시도" }]);
    expect(statuses.at(-1)).toBe("saved");
  });
});
