import { countDone, type DayCard as DayCardData } from "@/entities/daily";
import { formatDayHeader } from "@/shared/lib/date";
import AddEntryForm from "./AddEntryForm";
import EntryRow from "./EntryRow";

type Props = {
  card: DayCardData;
  // 오늘 카드에만 입력줄과 루틴 메뉴가 있다
  isToday?: boolean;
};

// 하루가 카드 한 장: 날짜 헤더 / 루틴·그날 항목(체크박스) / (오늘만) 입력줄 / 합계 줄. 작업 일정은 "할 일" 탭에서 본다.
export default function DayCard({ card, isToday = false }: Props) {
  const { done, total } = countDone(card.entries);

  return (
    <section aria-label={formatDayHeader(card.date)} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold">
        {formatDayHeader(card.date)}
        {isToday && <span className="ml-1.5 font-normal text-zinc-400">· 오늘</span>}
      </h2>

      {card.entries.length > 0 && (
        <ul className="divide-y divide-zinc-50">
          {card.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} isToday={isToday} />
          ))}
        </ul>
      )}

      {isToday && <AddEntryForm date={card.date} />}

      <p className="border-t border-zinc-100 bg-zinc-50/70 px-4 py-2 text-xs text-zinc-500">
        {total === 0 ? "아직 항목이 없어요" : `${total}개 중 ${done}개 완료`}
      </p>
    </section>
  );
}
