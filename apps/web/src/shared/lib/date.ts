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
