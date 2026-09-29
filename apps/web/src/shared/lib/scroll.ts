// container 안에서 el이 보이도록 container만 스크롤한다.
// element.scrollIntoView는 바깥 페이지(main)까지 같이 움직여서, 따로 스크롤되는 사이드 영역엔 쓰지 않는다.
export function revealInContainer(container: HTMLElement, el: HTMLElement, margin = 8) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  if (e.top < c.top + margin) {
    container.scrollTop -= c.top + margin - e.top;
  } else if (e.bottom > c.bottom - margin) {
    container.scrollTop += e.bottom - (c.bottom - margin);
  }
}
