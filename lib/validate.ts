import { categorize } from "./categorize";
import { addMinutesLocal, parseRrule } from "./localTime";
import { CATEGORIES, type Category, type ProposedEvent } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function cleanRrule(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const rule = value.trim().replace(/^RRULE:/i, "").toUpperCase();
  if (rule.includes("DTSTART") || rule.includes("\n")) return null;
  try {
    return parseRrule(rule).freq === undefined ? null : rule;
  } catch {
    return null;
  }
}

/** Normalize an event from Claude or the browser; returns null if it can't be used. */
export function cleanEvent(raw: any): ProposedEvent | null {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (typeof raw.start !== "string") return null;

  let allDay = Boolean(raw.allDay);
  // A "timed" event with only a date is really an all-day event.
  if (!allDay && DATE_RE.test(raw.start.trim())) allDay = true;

  const norm = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim().slice(0, allDay ? 10 : 16);
    return (allDay ? DATE_RE : DATETIME_RE).test(s) ? s : null;
  };

  const start = norm(raw.start);
  if (!start) return null;
  let end = norm(raw.end);
  if (end && end < start) end = null;
  if (!allDay && (!end || end === start)) end = addMinutesLocal(start, 60);
  if (allDay && end === start) end = null;

  const title = raw.title.trim().slice(0, 200);
  const category: Category = CATEGORIES.includes(raw.category) ? raw.category : categorize(title);
  const location = typeof raw.location === "string" && raw.location.trim() ? raw.location.trim() : null;

  return { title, start, end, allDay, location, category, rrule: cleanRrule(raw.rrule) };
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
