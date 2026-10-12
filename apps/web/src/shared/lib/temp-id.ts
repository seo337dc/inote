// 낙관적으로 먼저 화면에 넣은 항목의 임시 id — 서버가 진짜 id를 주기 전에는 조작(체크·수정·삭제)을 막는다.
export const TEMP_ID_PREFIX = "temp-";

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}
