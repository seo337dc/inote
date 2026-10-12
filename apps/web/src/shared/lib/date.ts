// 서버 컴포넌트(Vercel, UTC)와 브라우저가 같은 시각을 그리도록 시간대를 한국으로 고정한다.
// toLocaleDateString만 쓰면 서버 렌더링 결과가 9시간 어긋난다.
const parts = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "2026.10.02 14:30"
export function formatDateTime(iso: string): string {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.formatToParts(new Date(iso)).find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

// 'YYYY-MM-DD' 날짜 문자열은 시간 없이 날짜만 뜻한다 — Date로 바꿔 시간대 계산을 하지 않고 문자열로만 다룬다.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// 한국 시간 기준 오늘 (en-CA 로캘이 YYYY-MM-DD로 내준다). 브라우저 시간대·서버(UTC)와 무관하게 같은 날짜.
export function todayKst(now: Date = new Date()): string {
  return dayFormat.format(now);
}

// "2026-10-12" + 1 → "2026-10-13". UTC 정오 기준으로 계산해 시간대·일광절약 영향이 없다.
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  return result.toISOString().slice(0, 10);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-10-12" → "10월 12일 (월)"
export function formatDayHeader(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}
