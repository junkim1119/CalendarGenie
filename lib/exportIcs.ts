import { CATEGORY_INFO } from "./colors";
import { exclusiveEnd } from "./events";
import { compactLocal } from "./localTime";
import type { CalEvent, ManualEvent } from "./types";

const UID_DOMAIN = "combined-calendar.local";

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 lines are at most 75 octets; longer ones continue on lines starting with a space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (bytes.encode(current + ch).length > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
    }
    current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function commonLines(title: string, location: string | null, category: CalEvent["category"]): string[] {
  const info = CATEGORY_INFO[category];
  const lines = [`SUMMARY:${escapeText(title)}`, `CATEGORIES:${info.label}`, `COLOR:${info.icsColor}`];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  return lines;
}

function manualLines(ev: ManualEvent, stamp: string): string[] {
  const end = exclusiveEnd(ev);
  const when = ev.allDay
    ? [`DTSTART;VALUE=DATE:${compactLocal(ev.start)}`, `DTEND;VALUE=DATE:${compactLocal(end)}`]
    : [`DTSTART;TZID=${ev.timezone}:${compactLocal(ev.start)}`, `DTEND;TZID=${ev.timezone}:${compactLocal(end)}`];
  return [
    "BEGIN:VEVENT",
    `UID:${ev.id}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    ...when,
    ...(ev.rrule ? [`RRULE:${ev.rrule}`] : []),
    ...commonLines(ev.title, ev.location, ev.category),
    "END:VEVENT",
  ];
}

export function buildIcs(events: ManualEvent[]): string {
  const stamp = utcStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CalendarGenie//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CalendarGenie",
    ...events.flatMap((ev) => manualLines(ev, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
