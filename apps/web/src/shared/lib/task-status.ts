// 작업(Task)의 상태 3단계. "할 일" 탭과 "오늘의 할일"의 작업 일정이 같은 값을 쓴다.
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
};
