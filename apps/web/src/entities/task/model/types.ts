import type { TaskStatus } from "@/shared/lib/task-status";

// 날짜는 시간 없는 'YYYY-MM-DD' 문자열(한국 날짜).
// 일정은 세 가지뿐이다: 없음 / 시작일만 / 시작일~종료일. **종료일만 있는 작업은 없다**(endDate가 있으면 startDate도 있고 endDate >= startDate).
export type Task = {
  id: string;
  groupId: string;
  title: string;
  status: TaskStatus;
  startDate: string | null;
  endDate: string | null;
  // 중요 표시(별) — 표시만 하고 정렬에는 영향을 주지 않는다
  starred: boolean;
};

export type TaskGroup = {
  id: string;
  name: string;
  starred: boolean;
  tasks: Task[];
};

export type CreateTaskInput = {
  groupId: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
};

// startDate/endDate를 null로 보내면 일정을 없앤다(startDate를 지우면 endDate도 함께 지워야 한다).
export type UpdateTaskInput = {
  id: string;
  title?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: TaskStatus;
  starred?: boolean;
};

export type UpdateGroupInput = {
  id: string;
  name?: string;
  starred?: boolean;
};
