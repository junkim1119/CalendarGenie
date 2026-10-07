export type Category = "social" | "class" | "other";
export const CATEGORIES: Category[] = ["social", "class", "other"];

/**
 * A saved event.
 * Times are local wall-clock strings: "YYYY-MM-DDTHH:mm" for timed events,
 * "YYYY-MM-DD" for all-day events. For all-day events `end` is the last day (inclusive).
 */
export interface ManualEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  category: Category;
  /** RFC 5545 rule without the "RRULE:" prefix, e.g. "FREQ=WEEKLY;BYDAY=TU,TH" */
  rrule: string | null;
  timezone: string;
}

/** An event being drafted in the form, before it is saved. */
export type ProposedEvent = Omit<ManualEvent, "id" | "timezone">;

/** One displayable occurrence of a saved event. */
export interface CalEvent {
  id: string;
  /** The saved event's id; deletes and downloads apply to the whole series. */
  baseId: string;
  title: string;
  /** "YYYY-MM-DDTHH:mm", or "YYYY-MM-DD" for all-day events. `end` is exclusive. */
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  category: Category;
  recurring: boolean;
}

export interface Store {
  manualEvents: ManualEvent[];
}
