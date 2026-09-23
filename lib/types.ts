export type Category = "social" | "class" | "other";
export const CATEGORIES: Category[] = ["social", "class", "other"];

/** A feed can force every event into one category, or let keyword rules decide ("auto"). */
export type FeedCategory = Category | "auto";

export type Provider = "canvas" | "google" | "outlook" | "other";

export interface Feed {
  id: string;
  name: string;
  url: string;
  provider: Provider;
  defaultCategory: FeedCategory;
}

/**
 * An event typed into the app (not from a feed).
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

/** An event parsed from text, before it is saved. */
export type ProposedEvent = Omit<ManualEvent, "id" | "timezone">;

/** One displayable occurrence, from either a feed or a manual event. */
export interface CalEvent {
  id: string;
  /** Series id: category overrides and deletes apply to the whole series. */
  baseId: string;
  title: string;
  /** ISO string; for all-day events "YYYY-MM-DD". `end` is exclusive. */
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  category: Category;
  source: "manual" | "feed";
  sourceName: string;
  recurring: boolean;
}

export interface Store {
  feeds: Feed[];
  manualEvents: ManualEvent[];
  /** Keyed by CalEvent.baseId of feed events. */
  categoryOverrides: Record<string, Category>;
}

export interface FeedError {
  feedId: string;
  name: string;
  message: string;
}
