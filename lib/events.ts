import { loadFeedEvents } from "./feeds";
import { addDaysLocal, addMinutesLocal, expandLocal, fakeToLocal, localToFake } from "./localTime";
import type { CalEvent, FeedError, ManualEvent, Store } from "./types";

/** End as FullCalendar expects it: exclusive, and always present. */
export function exclusiveEnd(ev: Pick<ManualEvent, "start" | "end" | "allDay">): string {
  if (ev.allDay) return addDaysLocal(ev.end ?? ev.start, 1, true);
  return ev.end ?? addMinutesLocal(ev.start, 60);
}

function manualInstances(ev: ManualEvent, rangeStart: Date, rangeEnd: Date): CalEvent[] {
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
    source: "manual",
    sourceName: "Typed in",
    recurring: Boolean(ev.rrule),
  }));
}

/** Every occurrence from manual events and all feeds within the range. Feed failures are reported, not thrown. */
export async function collectEvents(store: Store, rangeStart: Date, rangeEnd: Date) {
  const events: CalEvent[] = store.manualEvents.flatMap((ev) => manualInstances(ev, rangeStart, rangeEnd));
  const errors: FeedError[] = [];

  const results = await Promise.allSettled(
    store.feeds.map((feed) => loadFeedEvents(feed, rangeStart, rangeEnd, store.categoryOverrides)),
  );
  results.forEach((result, i) => {
    const feed = store.feeds[i];
    if (result.status === "fulfilled") events.push(...result.value);
    else errors.push({ feedId: feed.id, name: feed.name, message: String(result.reason?.message ?? result.reason) });
  });

  return { events, errors };
}
