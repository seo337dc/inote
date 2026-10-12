// 날짜(date)는 시간 없는 'YYYY-MM-DD' 문자열 (한국 날짜).

// 그날 항목 — 직접 추가한 것이든 고정 리스트에서 복사해 온 것이든 같은 종류다(서로 이어져 있지 않다).
export type DailyEntry = {
  id: string;
  date: string;
  title: string;
  done: boolean;
};

export type DayCard = {
  date: string;
  entries: DailyEntry[];
};

// 지난 기록 화면용 — 기록이 있는 날만, 최신순. nextBefore가 null이면 끝.
export type DayCardPage = {
  items: DayCard[];
  nextBefore: string | null;
};

// 그날 항목 추가 — 고정 리스트에 넣고 싶으면 항목의 ⋯ 메뉴에서 "고정 리스트에 추가"를 고른다.
export type AddEntryInput = {
  title: string;
};

// 고정 리스트의 한 항목 — 설정 화면의 [오늘 카드에 모두 가져오기]를 누르면 제목이 오늘 카드에 새 항목으로 복사된다.
export type Routine = {
  id: string;
  title: string;
};
