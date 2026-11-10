/** 자동저장 디바운스처럼 시간이 지나야 하는 동작을 기다릴 때 쓴다. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
