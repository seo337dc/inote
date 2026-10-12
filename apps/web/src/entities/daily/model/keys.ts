// 오늘의 할일 캐시 키 — 날짜별 카드 하나가 한 캐시 항목이다.
export const DAILY_KEY = ["daily"] as const;
export const dayCardKey = (date: string) => ["daily", "day", date] as const;

// 낙관적으로 먼저 넣은 항목의 임시 id 접두사 — 서버가 진짜 id를 주기 전에는 체크 같은 조작을 막는다.
export const TEMP_ID_PREFIX = "temp-";
