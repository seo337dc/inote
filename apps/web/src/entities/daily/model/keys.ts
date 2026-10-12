// 오늘의 할일 캐시 키 — 날짜별 카드 하나가 한 캐시 항목이다.
export const DAILY_KEY = ["daily"] as const;
export const DAILY_HISTORY_KEY = ["daily", "history"] as const;
export const DAILY_MONTH_KEY = ["daily", "month"] as const;
export const dayCardKey = (date: string) => ["daily", "day", date] as const;

export { TEMP_ID_PREFIX } from "@/shared/lib/temp-id";
