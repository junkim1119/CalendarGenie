import type { Category, FeedCategory } from "./types";

const CLASS_RE =
  /\b(lecture|class|lab|recitation|exam|midterm|final|quiz|homework|hw|assignment|due|office hours|discussion|seminar|course|tutorial|study session|project)\b/i;
const SOCIAL_RE =
  /\b(party|dinner|lunch|brunch|breakfast|hang ?out|birthday|bday|game night|concert|drinks|coffee|club|meetup|movie|wedding|date night|trip|formal|game|beer|mixer|social|association|night out)\b/i;

/** Pick a category from the feed's default, falling back to keyword rules. Class words win over social words. */
export function categorize(text: string, feedDefault: FeedCategory = "auto"): Category {
  if (feedDefault !== "auto") return feedDefault;
  if (CLASS_RE.test(text)) return "class";
  if (SOCIAL_RE.test(text)) return "social";
  return "other";
}
