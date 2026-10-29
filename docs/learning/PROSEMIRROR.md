# ProseMirror 학습 문서

> 에디터 스크롤 문제(글이 화면 맨 아래에 닿으면 스크롤이 안 내려가는 현상)를 보다가 `editorProps`의
> `scrollMargin`/`scrollThreshold`가 ProseMirror 옵션이라는 걸 알게 되면서 정리한 문서.
> 2026-10-28 작성. 이 프로젝트에서 쓰는 방식 위주로 적었고, 전체 API를 다루지는 않는다.

---

## 1. 사이드프로젝트에서 왜 이게 나오나

"글쓰기 기능을 노션처럼 만들자"로 시작하면 에디터를 직접 만들게 되는데, 이때 처음 부딪히는 선택이 있다.

**`<textarea>`나 `contenteditable`을 직접 쓰면 안 되나?**

- `<textarea>`는 글자만 담는다. 굵게·제목·표·이미지·체크리스트를 한 화면에 섞을 수 없다.
- `contenteditable`(브라우저가 제공하는 "이 div를 직접 편집 가능하게")은 서식을 지원하지만, **브라우저마다 동작이
  다르고** 엔터·붙여넣기·undo·IME(한글 조합 입력)에서 버그가 끝없이 나온다. 직접 만들면 에디터를 만드는
  프로젝트가 되어버린다.

그래서 보통 **에디터 프레임워크**를 가져다 쓴다. 이 프로젝트의 계보는 이렇다.

```
ProseMirror  ← 에디터 엔진 (핵심, 저수준)
   └─ Tiptap  ← ProseMirror를 쓰기 편하게 감싼 라이브러리 (확장·React 연동)
        └─ inote의 PostEditor  ← Tiptap + 우리가 만든 확장(콜아웃, 이미지, 슬래시 메뉴 등)
```

`package.json`에는 `@tiptap/*`만 보이지만, Tiptap은 내부가 전부 ProseMirror다. 그래서 평소엔 Tiptap API만
쓰다가, **Tiptap이 감춰주지 않는 부분(스크롤, 커서 위치 계산, 붙여넣기 가로채기 등)에서 ProseMirror가
튀어나온다.** 이번 스크롤 문제가 정확히 그 경우다. 비슷하게 만든 에디터(노션류, 위키, CMS)들은 대부분 같은 길을
간다.

---

## 2. ProseMirror 핵심 개념

ProseMirror의 가장 큰 특징은 **"DOM이 진실이 아니라 데이터(state)가 진실"** 이라는 점이다. React와 닮았다.

```
state (문서 + 선택 영역) ──▶ view가 DOM으로 그림
        ▲                          │
        └── transaction ◀── 사용자 입력(타이핑, 붙여넣기…)
```

| 개념 | 한 줄 설명 | 이 프로젝트에서 보이는 곳 |
|------|-----------|--------------------------|
| **Schema** | 문서에 어떤 블록·서식이 존재할 수 있는지 정의 (문단, 제목, 표, 굵게…) | 콜아웃·이미지 같은 커스텀 노드 ([callout.ts](../../apps/web/src/shared/ui/editor/callout.ts), [image-extension.ts](../../apps/web/src/shared/ui/editor/image-extension.ts)) |
| **Node / Mark** | Node = 블록(문단, 표). Mark = 글자에 붙는 서식(굵게, 링크) | StarterKit, Table 등 |
| **State** | 현재 문서 + 선택(커서) 상태. **불변** — 바꾸려면 새 state를 만든다 | `editor.state` |
| **Transaction** | state를 바꾸는 "변경 요청서". 글자 삽입, 노드 교체, 커서 이동을 담는다 | `view.dispatch(tr...)` ([line-heading.ts](../../apps/web/src/shared/ui/editor/line-heading.ts), [markdown-paste.ts](../../apps/web/src/shared/ui/editor/markdown-paste.ts)) |
| **View** | state를 실제 DOM으로 그리고, 사용자 입력을 transaction으로 바꾼다 | `editorProps`로 설정 ([PostEditor.tsx](../../apps/web/src/shared/ui/editor/PostEditor.tsx)) |
| **Plugin** | state/view에 끼어드는 확장 지점 (입력 가로채기, 장식 추가 등) | Tiptap의 Extension이 내부적으로 만드는 것 |

> Tiptap 용어 대응: Tiptap의 `Extension`/`Node`/`Mark`는 ProseMirror의 Schema 조각 + Plugin을 편하게 묶어놓은 것.

### 알아두면 좋은 성질

- **문서는 HTML이 아니라 트리 구조의 데이터**다. `editor.getHTML()`은 그 트리를 HTML로 "내보낸 것"일 뿐이다.
  (이 프로젝트가 서버에 HTML을 저장하는 이유와 연결됨)
- **직접 DOM을 만지면 안 된다.** 에디터 DOM을 `document.querySelector`로 고치면 state와 어긋나서 깨진다.
  항상 transaction을 통해 바꾼다.
- **`tr.scrollIntoView()`** 처럼 transaction에 "이 변경 후 커서가 보이게 스크롤하라"는 표시를 달 수 있다.
  우리 코드의 `view.dispatch(tr.scrollIntoView())`가 이것.

---

## 3. 이번 스크롤 문제와의 연결

ProseMirror는 타이핑으로 커서가 움직이면 **커서가 화면 안에 보이게 자동 스크롤**한다. 그런데 "화면 가장자리에서
얼마나 떨어져 있어야 하나"의 기본 여백이 매우 작아서(약 5px), 커서가 화면 맨 아래에 붙은 채로 입력되는 것처럼
느껴진다. 이를 `editorProps`로 조정할 수 있다. (`prosemirror-view` 1.42.3 타입 정의 기준 기본값은
`scrollThreshold` 0, `scrollMargin` 5. 스크롤 컨테이너는 window가 아니라 `ChatWorkspace`의 `<main>`이다.)

```ts
editorProps: {
  // 커서가 화면 아래 160px 안으로 들어오면 미리 스크롤한다
  scrollThreshold: { top: 80, bottom: 160, left: 0, right: 0 },
  // 스크롤할 때 커서 주변에 남겨둘 여백
  scrollMargin: { top: 80, bottom: 160, left: 0, right: 0 },
}
```

- `scrollThreshold`: 이 거리 안으로 커서가 들어오면 스크롤을 *시작*한다.
- `scrollMargin`: 스크롤한 뒤 커서 주변에 *남겨둘* 여백.
- 화면 위쪽(`top`)에 sticky 툴바가 있으면 그 높이만큼 여유를 줘야 커서가 툴바에 가려지지 않는다.

**실제 적용 (2026-10-28)**: [PostEditor.tsx](../../apps/web/src/shared/ui/editor/PostEditor.tsx)의 `SCROLL_PADDING =
{ top: 80, bottom: 160, left: 0, right: 0 }`을 `scrollThreshold`와 `scrollMargin` 둘 다에 넣었다. 그리고 에디터 테두리 박스
**바깥**에 `pb-[40vh]` 래퍼를 둬서 마지막 줄 아래에도 스크롤할 공간을 만들었다.

- top 80: 툴바 아래 끝이 약 65px(1280px 폭 기준)이라 그보다 크게. bottom 160: sticky 저장 바가 약 72px이라 그보다 크게.
- 임시 페이지에서 측정: 원래 코드는 입력 중 커서가 화면 아래에서 2px(저장 바에 가려짐), 위로 이동 시 툴바에 −49px 가려졌다.
  수정 후 저장 바와 약 85px, 툴바와 최소 12px 간격이 남는다.
- 설정값이 들어갔는지는 테스트로 지키지만 **실제 스크롤 동작은 jsdom이 못 잡으므로** 위 값은 브라우저에서 잰 것이다.
  확인하지 못한 것(붙여넣기 직후, 모바일 키보드, 실제 글쓰기 화면)은 [`docs/todo/editor-scroll.md`](../todo/editor-scroll.md).

---

## 4. 처음 보는 사람이 자주 막히는 지점

1. **"Tiptap 문서에 없는데?"** → ProseMirror 문서를 봐야 하는 경우다. 검색할 때 `tiptap` 대신 `prosemirror <기능>`도
   같이 찾아본다.
2. **React state처럼 쓰려고 하면 꼬인다.** 에디터 내용은 React state가 아니라 ProseMirror state가 소유한다.
   바깥에서 내용을 바꿀 땐 `editor.commands.setContent`처럼 에디터 API를 거친다
   ([PostEditor.tsx](../../apps/web/src/shared/ui/editor/PostEditor.tsx)의 content 동기화 `useEffect` 참고).
3. **jsdom 테스트에서 에러.** jsdom에는 레이아웃이 없어서 ProseMirror가 좌표를 계산하는 `scrollIntoView` 등이
   터진다. 그래서 에디터 테스트 파일마다 `Element.prototype.scrollIntoView = vi.fn()` 같은 mock이 있다.
4. **스크롤·커서 위치 같은 "레이아웃 동작"은 테스트로 못 잡는다** → 설정값이 들어갔는지만 테스트하고, 실제
   동작은 브라우저에서 직접 확인한다.

---

## 5. 더 읽을 것

- ProseMirror 공식 가이드: https://prosemirror.net/docs/guide/ — "Document", "Transform", "State" 장만 읽어도 충분
- ProseMirror View 레퍼런스(`scrollThreshold`·`scrollMargin` 등 `editorProps`의 원형): https://prosemirror.net/docs/ref/#view.EditorProps
- Tiptap 문서: https://tiptap.dev/docs — 커스텀 확장을 만들 때(Node/Extension)
