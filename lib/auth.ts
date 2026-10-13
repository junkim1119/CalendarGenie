// Shared by middleware (Edge runtime) and the login route, so it only uses Web Crypto.

export const AUTH_COOKIE = "cg_auth";

/** The cookie value that proves the visitor knew APP_PASSWORD1. Changing the password logs everyone out. */
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`calendar-genie:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
