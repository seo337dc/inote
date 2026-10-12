// 달력 팝업에서 날짜를 누르며 일정을 고르는 순서 — 첫 클릭은 시작일, 두 번째 클릭은 종료일이다.
// 일정은 없음 / 시작일만 / 시작일~종료일뿐이라(종료일만은 없음) 종료일은 항상 시작일 이후에서만 정해진다.
export type PickState = {
  startDate: string | null;
  endDate: string | null;
  // 시작일을 막 눌러서 종료일(또는 같은 날 한 번 더)을 기다리는 중
  picking: boolean;
};

export type PickResult = PickState & {
  // 일정이 확정돼서 팝업을 닫아도 되는 상태
  done: boolean;
};

export function pickDate(state: PickState, day: string): PickResult {
  // 처음 누르거나, 이미 끝난 일정 위에서 다시 누르면 새 시작일로 시작한다(예전 종료일은 버린다)
  if (!state.picking || state.startDate === null) {
    return { startDate: day, endDate: null, picking: true, done: false };
  }
  // 시작일보다 앞 날짜를 누르면 그날을 새 시작일로 바꾸고 계속 종료일을 기다린다
  if (day < state.startDate) {
    return { startDate: day, endDate: null, picking: true, done: false };
  }
  // 시작일과 같은 날을 한 번 더 누르면 하루짜리 일정으로 확정한다
  if (day === state.startDate) {
    return { startDate: day, endDate: null, picking: false, done: true };
  }
  return { startDate: state.startDate, endDate: day, picking: false, done: true };
}
