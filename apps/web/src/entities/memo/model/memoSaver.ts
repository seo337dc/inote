import { createMemo, updateMemo } from "../api/memos";
import type { Memo, MemoSaveStatus, MemoTarget } from "./types";

export const MEMO_AUTOSAVE_MS = 1500;

type Options = {
  target: MemoTarget;
  /** 서버에 이미 있는 메모(없으면 null) */
  memo: Memo | null;
  delayMs?: number;
  onStatus: (status: MemoSaveStatus) => void;
};

/**
 * 메모 자동저장 엔진 (React와 무관).
 * - 입력이 멈추고 delayMs가 지나면 저장한다. 서버에 메모가 없으면 처음 한 번만 POST, 그 뒤는 PATCH.
 * - 내용이 비어 있고 서버에도 메모가 없으면 보내지 않는다(빈 행 방지).
 * - 요청은 한 번에 하나만 나간다. POST가 끝나기 전에 입력이 더 들어와도 PATCH는 그 뒤에 나가며,
 *   요청 중에 쌓인 변경은 끝난 직후 마지막 값 하나로 보낸다.
 * - 실패하면 status를 error로 두고 멈춘다. 다음 입력(또는 flush)에서 다시 시도한다.
 */
export class MemoSaver {
  private memoId: string | null;
  private saved: string;
  private latest: string;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private readonly options: Options) {
    this.memoId = options.memo?.id ?? null;
    this.saved = options.memo?.content ?? "";
    this.latest = this.saved;
  }

  update(text: string) {
    this.latest = text;
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

  private async run() {
    if (this.running) return; // 진행 중인 루프가 끝난 뒤 최신 값을 이어서 보낸다
    this.running = true;
    let didSave = false;
    try {
      while (this.latest !== this.saved) {
        const content = this.latest;
        if (!this.memoId && content === "") {
          this.saved = content;
          break;
        }
        this.options.onStatus("saving");
        try {
          if (this.memoId) {
            await updateMemo(this.memoId, content);
          } else {
            this.memoId = (await createMemo(this.options.target, content)).id;
          }
        } catch {
          this.options.onStatus("error");
          return;
        }
        this.saved = content;
        didSave = true;
      }
      if (didSave) this.options.onStatus("saved");
    } finally {
      this.running = false;
    }
  }
}
