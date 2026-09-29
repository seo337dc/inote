// 서버 카테고리 조회가 실패했거나 아직 안 끝났을 때(로그인 안 한 화면 등) 쓰는 기본값.
// 실제 카테고리는 BE(GET /categories)가 유저별로 관리 — 여긴 fallback 이름만.
export const CATEGORIES: string[] = ["학습", "이직", "일기", "블로그", "기록"];
