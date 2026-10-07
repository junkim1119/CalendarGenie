// Converts between RRULE strings and the simple repeat options the form offers.

export type Freq = "none" | "DAILY" | "WEEKLY" | "MONTHLY";
export const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Repeat {
  freq: Freq;
  /** Only used for WEEKLY. */
  days: Weekday[];
  /** Last date the event repeats on, "YYYY-MM-DD", or null for forever. */
  until: string | null;
}

export const NO_REPEAT: Repeat = { freq: "none", days: [], until: null };

export function parseRepeat(rrule: string | null): Repeat {
  if (!rrule) return NO_REPEAT;
  const parts = Object.fromEntries(
    rrule.split(";").map((p) => p.split("=") as [string, string]),
  );
  const freq: Freq = ["DAILY", "WEEKLY", "MONTHLY"].includes(parts.FREQ) ? (parts.FREQ as Freq) : "none";
  const days = (parts.BYDAY?.split(",") ?? []).filter((d: string): d is Weekday =>
    (WEEKDAYS as readonly string[]).includes(d),
  );
  const u = parts.UNTIL?.match(/^(\d{4})(\d{2})(\d{2})/);
  return { freq, days, until: u ? `${u[1]}-${u[2]}-${u[3]}` : null };
}

export function buildRrule(r: Repeat): string | null {
  if (r.freq === "none") return null;
  let rule = `FREQ=${r.freq}`;
  if (r.freq === "WEEKLY" && r.days.length) {
    rule += `;BYDAY=${WEEKDAYS.filter((d) => r.days.includes(d)).join(",")}`;
  }
  if (r.until) rule += `;UNTIL=${r.until.replace(/-/g, "")}T235959`;
  return rule;
}

const DAY_NAMES: Record<Weekday, string> = {
  SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat",
};

export function describeRepeat(rrule: string | null): string {
  const r = parseRepeat(rrule);
  if (r.freq === "none") return "";
  let text = r.freq === "DAILY" ? "Every day" : r.freq === "MONTHLY" ? "Every month" : "Every week";
  if (r.freq === "WEEKLY" && r.days.length) text = `Every ${r.days.map((d) => DAY_NAMES[d]).join(", ")}`;
  if (r.until) {
    const d = new Date(`${r.until}T00:00`);
    text += ` until ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return text;
}

export const dayLabel = (d: Weekday) => DAY_NAMES[d];
