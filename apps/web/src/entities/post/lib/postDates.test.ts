import { describe, expect, it } from "vitest";
import { getPostDates } from "./postDates";

const PUBLISHED = "2026-10-01T00:00:00.000Z";
const EDITED = "2026-10-02T00:00:00.000Z";
const CREATED = "2026-09-30T00:00:00.000Z";

describe("getPostDates", () => {
  it("작성 시각은 createdAt이 아니라 발행 시각이다", () => {
    const { writtenAt } = getPostDates({ createdAt: CREATED, publishedAt: PUBLISHED, lastEditedAt: PUBLISHED });
    expect(writtenAt).toBe(PUBLISHED);
  });

  it("발행 뒤 다시 저장하지 않았으면(lastEditedAt === publishedAt) 수정 시각이 없다", () => {
    const { editedAt } = getPostDates({ createdAt: CREATED, publishedAt: PUBLISHED, lastEditedAt: PUBLISHED });
    expect(editedAt).toBeNull();
  });

  it("발행 뒤 다시 저장했으면 수정 시각을 돌려준다", () => {
    const { editedAt } = getPostDates({ createdAt: CREATED, publishedAt: PUBLISHED, lastEditedAt: EDITED });
    expect(editedAt).toBe(EDITED);
  });

  it("아직 발행 안 한 draft는 작성 시각으로 createdAt을 쓰고 수정 시각은 없다", () => {
    const dates = getPostDates({ createdAt: CREATED, publishedAt: null, lastEditedAt: null });
    expect(dates).toEqual({ writtenAt: CREATED, editedAt: null });
  });

  it("BE 반영 전이라 lastEditedAt이 비어 있어도 수정 시각 없이 동작한다", () => {
    const { editedAt } = getPostDates({ createdAt: CREATED, publishedAt: PUBLISHED, lastEditedAt: null });
    expect(editedAt).toBeNull();
  });
});
