import { createMemo, updateMemo } from "../api/memos";
import type { Memo, MemoSaveStatus, MemoTarget } from "./types";

export const MEMO_AUTOSAVE_MS = 1500;

type Options = {
  target: MemoTarget;
  /** 서버에 이미 있는 메모(없으면 null) */
  memo: Memo | null;
  delayMs?: number;
  onStatus: (status: MemoSaveStatus) => void;
  /** 서버에 없던 메모가 POST로 만들어졌을 때 (삭제·순서 변경에 쓸 id를 알려준다) */
  onCreated?: (memo: Memo) => void;
};

type Fields = { title: string; content: string };

/**
 * 메모 한 장의 자동저장 엔진 (React와 무관). 여러 장이면 장마다 하나씩 만든다.
 * - 제목·내용 중 바뀐 것만 보낸다. 입력이 멈추고 delayMs가 지나면 저장한다.
 * - 서버에 메모가 없으면(memo=null) 처음 한 번만 POST, 그 뒤는 PATCH. 둘 다 비어 있으면 보내지 않는다(빈 행 방지).
 * - 요청은 한 번에 하나만 나간다. POST가 끝나기 전에 입력이 더 들어와도 PATCH는 그 뒤에 나가며,
 *   요청 중에 쌓인 변경은 끝난 직후 마지막 값 하나로 보낸다.
 * - 실패하면 status를 error로 두고 멈춘다. 다음 입력(또는 flush)에서 다시 시도한다.
 */
export class MemoSaver {
  private memoId: string | null;
  private saved: Fields;
  private latest: Fields;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private readonly options: Options) {
    this.memoId = options.memo?.id ?? null;
    this.saved = { title: options.memo?.title ?? "", content: options.memo?.content ?? "" };
    this.latest = { ...this.saved };
  }

  update(patch: Partial<Fields>) {
    this.latest = { ...this.latest, ...patch };
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, this.options.delayMs ?? MEMO_AUTOSAVE_MS);
  }

  /** 기다리지 않고 지금 저장한다 (패널을 닫거나 화면을 떠날 때). */
  flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this.run();
  }

  /** 기다리던 저장을 멈춘다(메모를 지우려는 동안). 변경은 버리지 않으므로 update({})로 다시 걸 수 있다. */
  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private changed(): Partial<Fields> {
    const diff: Partial<Fields> = {};
    if (this.latest.title !== this.saved.title) diff.title = this.latest.title;
    if (this.latest.content !== this.saved.content) diff.content = this.latest.content;
    return diff;
  }

  private async run() {
    if (this.running) return; // 진행 중인 루프가 끝난 뒤 최신 값을 이어서 보낸다
    this.running = true;
    let didSave = false;
    try {
      for (let diff = this.changed(); Object.keys(diff).length > 0; diff = this.changed()) {
        const sent = { ...this.latest };
        if (!this.memoId && sent.title === "" && sent.content === "") {
          this.saved = sent;
          break;
        }
        this.options.onStatus("saving");
        try {
          if (this.memoId) {
            await updateMemo(this.memoId, diff);
          } else {
            const created = await createMemo(this.options.target, diff);
            this.memoId = created.id;
            this.options.onCreated?.(created);
          }
        } catch {
          this.options.onStatus("error");
          return;
        }
        this.saved = sent;
        didSave = true;
      }
      if (didSave) this.options.onStatus("saved");
    } finally {
      this.running = false;
    }
  }
}
