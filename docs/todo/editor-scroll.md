# 할 일 — 에디터 스크롤 후속 (inote)

> 2026-10-28 에디터 스크롤 수정(`scrollThreshold`/`scrollMargin` + 하단 여유 공간)에서 **확인하지 못했거나 일부러 안 한 것**.
> 경위는 [`docs/devlog/fe.md`](../devlog/fe.md) 2026-10-28 항목.

## 남긴 것
- [ ] **붙여넣기 직후 화면이 커서를 따라가지 않음** — 원래 코드에서도 같다. 합성 `ClipboardEvent`(text/plain 20줄, 마크다운 목록 20줄)로 재현했고 `scrollTop`이 그대로였다. 붙여넣기 처리는 `shared/ui/editor/markdown-paste.ts`(plain은 `scrollIntoView` 있음, 그 외는 `editor.chain().focus().insertContent()`). 실제 붙여넣기로 다시 확인한 뒤 원인 조사
- [ ] **모바일 키보드가 올라올 때의 동작** — 이번 범위 밖이라 확인하지 않았다(키보드가 가리는 영역과 하단 저장 바·`pb-[40vh]`의 상호작용 확인 필요)
- [ ] **실제 글쓰기 화면(`/write`, `/reading` 기록 화면)에서 직접 확인** — 로그인이 필요해 이번에는 `main` 스크롤 + sticky 저장 바를 흉내낸 임시 페이지에서만 측정했다
- [ ] **툴바가 더 많이 줄바꿈되는 폭에서 top 80이 충분한지** — 측정은 1280px(툴바 아래 끝 약 65px)에서만 했다. `sm`~`md` 폭에서 툴바가 여러 줄이면 커서가 툴바에 가려질 수 있다
