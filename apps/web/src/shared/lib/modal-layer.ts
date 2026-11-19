// 지금 화면을 덮고 있는 모달 레이어(시트·대화상자·출간 설정 화면 같은 전체 화면 창)가 열려 있는지.
// 이런 레이어는 항상 떠 있는 창(메모장 등)보다 앞에 있어서, Esc는 앞에 있는 것부터 하나씩 닫혀야 한다 —
// 떠 있는 창이 Esc를 먼저 받으면 앞의 모달이 닫히기도 전에 뒤의 창이 사라진다.
// - 공용 Sheet·Dialog(shared/ui)는 열려 있는 동안에만 data-slot="…-content"를 렌더한다. 닫히는 애니메이션 중(data-ending-style)은 닫힌 것으로 본다.
// - 그 밖의 전체 화면 창은 aria-modal="true"를 달고, 닫혀 있을 때는 aria-hidden="true"로 둔다(PublishScreen).
// aria-modal이 없는 일반 dialog(떠 있는 메모 패널)는 모달이 아니다.
const MODAL_LAYER_SELECTOR = [
  '[data-slot="sheet-content"]:not([data-ending-style])',
  '[data-slot="dialog-content"]:not([data-ending-style])',
  '[role="dialog"][aria-modal="true"]:not([aria-hidden="true"])',
].join(", ");

export function hasOpenModalLayer(): boolean {
  return document.querySelector(MODAL_LAYER_SELECTOR) !== null;
}
