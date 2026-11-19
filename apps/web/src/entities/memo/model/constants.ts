/** 메모 한 장의 최대 글자 수 (API 계약: 10,000자, 일반 텍스트). */
export const MEMO_MAX_LENGTH = 10000;
/** 메모 제목 최대 글자 수. */
export const MEMO_TITLE_MAX_LENGTH = 30;
/** 대상 하나에 만들 수 있는 메모 수. 넘으면 서버가 409. */
export const MEMO_MAX_COUNT = 10;
/**
 * Esc를 스스로 처리하는 메모장 안의 요소(탭 이름 입력창, 넘친 탭 목록)에 붙이는 표시.
 * 메모장은 열려 있을 때 Esc를 다른 것보다 먼저 받아 닫는데, 이 요소 안에서 누른 Esc는 건너뛴다 —
 * 그 요소가 자기 일(편집 끝내기, 목록 닫기)을 먼저 하고, 다음 Esc에 메모장이 닫힌다.
 */
export const MEMO_ESC_OWNER_PROPS = { "data-memo-esc-owner": "" } as const;
export const MEMO_ESC_OWNER_SELECTOR = "[data-memo-esc-owner]";
