import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  basePath: "/api/v1/auth",
  plugins: [inferAdditionalFields({ user: { role: { type: "string", input: false } } })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
