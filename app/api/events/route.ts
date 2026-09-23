import { randomUUID } from "crypto";
import { collectEvents } from "@/lib/events";
import { readStore, updateStore } from "@/lib/store";
import { CATEGORIES, type ManualEvent, type ProposedEvent } from "@/lib/types";
import { cleanEvent, isValidTimezone } from "@/lib/validate";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function parseDate(value: string | null, fallback: Date): Date {
  const d = value ? new Date(value) : fallback;
  return isNaN(d.getTime()) ? fallback : d;
}

/** GET ?start=&end= : every occurrence in the range, plus any feeds that failed to load. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const start = parseDate(params.get("start"), new Date(Date.now() - 31 * DAY));
  const end = parseDate(params.get("end"), new Date(Date.now() + 62 * DAY));
  const store = await readStore();
  return Response.json(await collectEvents(store, start, end));
}

/** POST {events, timezone}: save events confirmed from the text box. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const timezone = isValidTimezone(body?.timezone) ? body.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const incoming = Array.isArray(body?.events) ? body.events : [];
  const events: ManualEvent[] = incoming
    .map(cleanEvent)
    .filter((e: ProposedEvent | null): e is ProposedEvent => e !== null)
    .map((e: ProposedEvent) => ({ ...e, id: randomUUID(), timezone }));
  if (events.length === 0) return Response.json({ error: "No valid events to save" }, { status: 400 });

  await updateStore((store) => {
    store.manualEvents.push(...events);
  });
  return Response.json({ saved: events.length });
}

/** PATCH {baseId, category}: recolor an event series. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (typeof body?.baseId !== "string" || !CATEGORIES.includes(body.category)) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  await updateStore((store) => {
    const manual = store.manualEvents.find((e) => e.id === body.baseId);
    if (manual) manual.category = body.category;
    else store.categoryOverrides[body.baseId] = body.category;
  });
  return Response.json({ ok: true });
}

/** DELETE ?id= : remove a typed-in event (the whole series if it repeats). */
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  await updateStore((store) => {
    store.manualEvents = store.manualEvents.filter((e) => e.id !== id);
  });
  return Response.json({ ok: true });
}
