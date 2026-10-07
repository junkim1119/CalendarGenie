import { AUTH_COOKIE, authToken, safeEqual } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NINETY_DAYS = 90 * 24 * 60 * 60;

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return Response.json({ ok: true });

  const body = await req.json().catch(() => null);
  const attempt = typeof body?.password === "string" ? body.password : "";
  const expected = await authToken(password);
  const given = await authToken(attempt);

  if (!safeEqual(given, expected)) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${AUTH_COOKIE}=${expected}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${NINETY_DAYS}${secure}`,
      },
    },
  );
}
