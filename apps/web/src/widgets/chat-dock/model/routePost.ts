// 주소에서 "지금 어떤 글을 다루는 화면인지"를 뽑는다.
// - 글쓰기/수정(/write/{id}): 대화 세션을 그 글로 강제 전환
// - 글 상세(/posts/{id}): 그 글에 이미 나눈 대화가 있을 때만 전환
export function getRoutePostIds(pathname: string) {
  return {
    routePostId: pathname.match(/^\/write\/([^/]+)$/)?.[1] ?? null,
    detailPostId: pathname.match(/^\/posts\/([^/]+)$/)?.[1] ?? null,
  };
}
