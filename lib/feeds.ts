import ical from "node-ical";
import { categorize } from "./categorize";
import type { CalEvent, Category, Feed } from "./types";

const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { at: number; text: string }>();

export function normalizeFeedUrl(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

async function fetchFeedText(url: string, fresh = false): Promise<string> {
  const normalized = normalizeFeedUrl(url);
  const hit = cache.get(normalized);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.text;

  const res = await fetch(normalized, {
    cache: "no-store",
    headers: { "User-Agent": "CombinedCalendar/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`The feed link returned HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link didn't return a calendar (.ics) file");
  cache.set(normalized, { at: Date.now(), text });
  return text;
}

/** Fetch and parse a feed; throws a readable error if the link is bad. Returns the number of events. */
export async function testFeed(url: string): Promise<number> {
  const data = ical.sync.parseICS(await fetchFeedText(url, true));
  return Object.values(data).filter((c: any) => c.type === "VEVENT").length;
}

export function forgetFeed(url: string) {
  cache.delete(normalizeFeedUrl(url));
}

// node-ical gives plain strings, or {val, params} when a property has parameters.
const text = (v: any): string => (v == null ? "" : typeof v === "string" ? v : String(v.val ?? v));

const pad = (n: number) => String(n).padStart(2, "0");
// node-ical creates all-day dates at local midnight.
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utcKey = (d: Date) => d.toISOString().slice(0, 10);

export async function loadFeedEvents(
  feed: Feed,
  rangeStart: Date,
  rangeEnd: Date,
  overrides: Record<string, Category>,
): Promise<CalEvent[]> {
  const data = ical.sync.parseICS(await fetchFeedText(feed.url));
  const out: CalEvent[] = [];

  for (const ev of Object.values(data) as any[]) {
    if (ev.type !== "VEVENT" || !ev.start) continue;
    // Modified single occurrences are handled through their parent's `recurrences`.
    if (ev.recurrenceid) continue;

    const allDay = ev.datetype === "date";
    const baseId = `${feed.id}:${ev.uid ?? text(ev.summary)}`;
    const title = text(ev.summary) || "(no title)";
    const category =
      overrides[baseId] ?? categorize(`${title} ${text(ev.description)}`, feed.defaultCategory);
    const defaultLength = allDay ? 86_400_000 : 3_600_000;
    const baseLength = ev.end ? ev.end.getTime() - ev.start.getTime() : defaultLength;

    const push = (start: Date, end: Date, src: any, idSuffix: string) => {
      if (end < rangeStart || start > rangeEnd) return;
      out.push({
        id: baseId + idSuffix,
        baseId,
        title: text(src.summary) || title,
        start: allDay ? localDate(start) : start.toISOString(),
        end: allDay ? localDate(end) : end.toISOString(),
        allDay,
        location: text(src.location) || null,
        category,
        source: "feed",
        sourceName: feed.name,
        recurring: Boolean(ev.rrule),
      });
    };

    if (!ev.rrule) {
      push(ev.start, new Date(ev.start.getTime() + baseLength), ev, "");
      continue;
    }

    const occurrences: Date[] = ev.rrule.between(new Date(rangeStart.getTime() - baseLength), rangeEnd, true);
    for (const occ of occurrences) {
      const key = allDay ? localDate(occ) : utcKey(occ);
      if (ev.exdate?.[key]) continue;
      const changed = ev.recurrences?.[key];
      if (changed) {
        if (changed.status === "CANCELLED") continue;
        const len = changed.end ? changed.end.getTime() - changed.start.getTime() : baseLength;
        push(changed.start, new Date(changed.start.getTime() + len), changed, `::${key}`);
      } else {
        push(occ, new Date(occ.getTime() + baseLength), ev, `::${key}`);
      }
    }
  }
  return out;
}
