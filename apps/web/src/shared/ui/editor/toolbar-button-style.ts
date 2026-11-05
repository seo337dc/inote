// 툴바의 토글 버튼(글자 버튼·아이콘 버튼·`…` 팝오버 항목)이 같이 쓰는 모양.
// active(켜진 서식)와 disabled 표현을 한 곳에서 관리해서, 한 곳만 바꿔 모양이 어긋나는 일을 막는다.
// layout은 버튼마다 다른 크기·배치(예: 글자 버튼 `px-2 py-1`, 팝오버 항목 `size-10`)만 넘긴다.
export function toolbarButtonClass(active: boolean | undefined, layout: string): string {
  return `${layout} rounded disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent ${
    active ? "bg-zinc-900 text-white hover:bg-zinc-800" : "hover:bg-zinc-100"
  }`;
}
