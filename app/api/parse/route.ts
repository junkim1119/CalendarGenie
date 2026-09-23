import { ParseError, parseEventsFromText } from "@/lib/parseText";
import { isValidTimezone } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** POST {text, timezone}: returns proposed events for review; nothing is saved here. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "Type some events first" }, { status: 400 });
  if (text.length > 20_000) return Response.json({ error: "That's too much text at once. Try splitting it up." }, { status: 400 });

  const timezone = isValidTimezone(body.timezone) ? body.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const events = await parseEventsFromText(text, timezone);
    return Response.json({ events });
  } catch (err) {
    if (err instanceof ParseError) return Response.json({ error: err.message }, { status: 502 });
    console.error(err);
    return Response.json({ error: "Something went wrong while reading your text." }, { status: 500 });
  }
}
