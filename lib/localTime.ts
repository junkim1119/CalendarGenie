import { RRule } from "rrule";

// Manual events store local wall-clock strings. For date math and recurrence we map them to
// "fake UTC" Dates (the wall-clock fields stored as UTC), so DST shifts never move an event.

export function localToFake(s: string): Date {
  const [d, t = "00:00"] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, day, h, mi));
}

export function fakeToLocal(d: Date, allDay: boolean): string {
  const iso = d.toISOString();
  return allDay ? iso.slice(0, 10) : iso.slice(0, 16);
}

export function addMinutesLocal(s: string, minutes: number, allDay = false): string {
  return fakeToLocal(new Date(localToFake(s).getTime() + minutes * 60_000), allDay);
}

export function addDaysLocal(s: string, days: number, allDay: boolean): string {
  return addMinutesLocal(s, days * 24 * 60, allDay);
}

/** Parse an RRULE, treating a date-only UNTIL as "through the end of that day". */
export function parseRrule(rrule: string) {
  const opts = RRule.parseString(rrule.replace(/^RRULE:/i, ""));
  if (opts.until && opts.until.getUTCHours() === 0 && opts.until.getUTCMinutes() === 0) {
    opts.until = new Date(opts.until.getTime() + 86_399_000);
  }
  return opts;
}

/** Start strings of every occurrence of a local recurring event that could fall in [rangeStart, rangeEnd]. */
export function expandLocal(start: string, rrule: string, allDay: boolean, rangeStart: Date, rangeEnd: Date): string[] {
  const rule = new RRule({ ...parseRrule(rrule), dtstart: localToFake(start) });
  // Widen by a day on each side to cover the gap between fake UTC and the real timezone.
  const day = 86_400_000;
  return rule
    .between(new Date(rangeStart.getTime() - day), new Date(rangeEnd.getTime() + day), true)
    .map((d) => fakeToLocal(d, allDay));
}

/** "2026-10-03T19:00" -> "20261003T190000", "2026-10-03" -> "20261003" */
export function compactLocal(s: string): string {
  const [d, t] = s.split("T");
  return d.replace(/-/g, "") + (t ? "T" + t.replace(":", "") + "00" : "");
}
