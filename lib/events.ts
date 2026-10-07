import { addDaysLocal, addMinutesLocal, expandLocal, fakeToLocal, localToFake } from "./localTime";
import type { CalEvent, ManualEvent } from "./types";

/** End as FullCalendar expects it: exclusive, and always present. */
export function exclusiveEnd(ev: Pick<ManualEvent, "start" | "end" | "allDay">): string {
  if (ev.allDay) return addDaysLocal(ev.end ?? ev.start, 1, true);
  return ev.end ?? addMinutesLocal(ev.start, 60);
}

/** Every occurrence of a saved event that could fall in [rangeStart, rangeEnd]. */
export function occurrences(ev: ManualEvent, rangeStart: Date, rangeEnd: Date): CalEvent[] {
  const lengthMs = localToFake(exclusiveEnd(ev)).getTime() - localToFake(ev.start).getTime();
  let starts = [ev.start];
  if (ev.rrule) {
    try {
      starts = expandLocal(ev.start, ev.rrule, ev.allDay, rangeStart, rangeEnd);
    } catch {
      // Invalid rule saved somehow: show just the first occurrence.
    }
  }
  return starts.map((start) => ({
    id: ev.rrule ? `${ev.id}::${start}` : ev.id,
    baseId: ev.id,
    title: ev.title,
    start,
    end: fakeToLocal(new Date(localToFake(start).getTime() + lengthMs), ev.allDay),
    allDay: ev.allDay,
    location: ev.location,
    category: ev.category,
    recurring: Boolean(ev.rrule),
  }));
}
