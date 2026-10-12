// 날짜(date)는 시간 없는 'YYYY-MM-DD' 문자열 (한국 날짜).

// 루틴 체크 기록 + 그날 추가 항목. title은 그날의 스냅샷이라, 루틴 이름을 나중에 바꿔도 지난 카드는 그대로다.
export type DailyEntry = {
  id: string;
  date: string;
  title: string;
  done: boolean;
  // 루틴에서 생긴 기록이면 루틴 id, 그날 추가 항목이면 null
  routineId: string | null;
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

// 그날 항목 추가 — 루틴은 항목을 만든 뒤 "매일 반복으로 만들기"로 따로 등록한다.
export type AddEntryInput = {
  title: string;
};
