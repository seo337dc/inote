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

// "2026-10-20" → "10.20." (연도 없이 월.일.)
export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}.${d}.`;
}

// 시작일 하나면 "10.20.", 기간이면 "10.20. ~ 10.25."
export function formatDateRange(startDate: string, endDate: string | null): string {
  return endDate ? `${formatShortDate(startDate)} ~ ${formatShortDate(endDate)}` : formatShortDate(startDate);
}

// 달력 라이브러리(Date)와 'YYYY-MM-DD' 문자열 사이 변환 — 시간대 계산 없이 그 컴퓨터의 달력 날짜 그대로 쓴다.
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateString(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 'YYYY-MM' 달 문자열 — 지난 기록의 달 이동용. 시간대 계산 없이 숫자로만 다룬다.
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// 그 달의 첫날(포함)과 다음 달 첫날(미포함) — `GET /daily?from=&before=`에 그대로 쓴다.
export function monthRange(month: string): { from: string; before: string } {
  return { from: `${month}-01`, before: `${shiftMonth(month, 1)}-01` };
}

// "2026-10" → "2026년 10월"
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}
