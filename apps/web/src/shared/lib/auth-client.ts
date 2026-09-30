import { useSyncExternalStore } from "react";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  basePath: "/api/v1/auth",
  plugins: [inferAdditionalFields({ user: { role: { type: "string", input: false } } })],
});

export const { signIn, signUp, signOut } = authClient;

// 서버 렌더링(및 브라우저의 첫 hydration 렌더)에서는 false, 그 뒤에는 true.
const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

// better-auth의 useSession을 그대로 쓰면 서버가 그린 HTML(로그인 정보 없음)과
// 브라우저의 첫 렌더(그 사이 도착한 세션 있음)가 달라져 hydration 에러가 난다.
// 그래서 hydration이 끝나기 전에는 서버와 똑같이 "로딩 중, 로그인 정보 없음"을 돌려주고,
// 끝난 뒤에 실제 세션을 돌려준다.
export function useSession() {
  const session = authClient.useSession();
  const hydrated = useHydrated();
  return hydrated ? session : { ...session, data: null, isPending: true };
}
