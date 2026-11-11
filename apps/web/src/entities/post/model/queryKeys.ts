// 글 관련 react-query 캐시 키의 앞부분(prefix). 카테고리 이름 수정처럼 다른 곳에서 캐시를 함께 고칠 때 쓴다.
export const MY_POSTS_KEY = ["my-posts"] as const;
export const POST_OUTLINE_KEY = ["post-outline"] as const;
export const MY_POST_OUTLINE_KEY = ["my-post-outline"] as const;
export const USER_OUTLINE_KEY = ["user-outline"] as const;
export const MY_DRAFTS_KEY = ["my-drafts"] as const;
// 글 상세 화면의 캐시 키(prefix) — 글 하나의 상태가 바뀌면(보관·임시저장 등) 함께 무효화한다
export const POST_DETAIL_KEY = ["post-detail"] as const;
export const POST_KEY = ["post"] as const;
