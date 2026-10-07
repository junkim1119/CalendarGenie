import * as chrono from "chrono-node";
import { categorize } from "./categorize";
import { buildRrule, NO_REPEAT, type Repeat, type Weekday } from "./repeat";
import type { ProposedEvent } from "./types";
import { cleanEvent } from "./validate";

// Free, offline reading of typed notes: one event per line (or per ";").
// chrono-node finds the date/time; simple patterns find repeats and places.

const DAY = "(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*";
const DAY_CODES: Record<string, Weekday> = {
  sun: "SU", mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR", sat: "SA",
};
const LIST_SEP = /\s*(?:\/|,|&|\band\b)\s*/i;

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date, allDay: boolean) => {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return allDay ? date : `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function extractRepeat(input: string, ref: Date): { text: string; repeat: Repeat } {
  let text = input;
  const repeat: Repeat = { ...NO_REPEAT, days: [] };
  const cut = (m: RegExpMatchArray | null) => {
    if (m) text = text.replace(m[0], " ");
    return m;
  };

  const until = cut(text.match(/\b(?:until|till|thru|through)\s+([^,;]+?)(?=\s+(?:in|at|@)\s|[,;]|$)/i));
  if (until) {
    const d = chrono.parseDate(until[1], ref, { forwardDate: true });
    if (d) repeat.until = toLocal(d, true);
  }

  let m: RegExpMatchArray | null;
  if ((m = cut(text.match(new RegExp(`\\b(?:every|each)\\s+(${DAY}(?:${LIST_SEP.source}${DAY})*)`, "i"))))) {
    repeat.freq = "WEEKLY";
    repeat.days = m[1]
      .split(LIST_SEP)
      .map((s) => DAY_CODES[s.slice(0, 3).toLowerCase()])
      .filter(Boolean);
  } else if (cut(text.match(/\b(?:every\s+)?weekdays?\b/i))) {
    repeat.freq = "WEEKLY";
    repeat.days = ["MO", "TU", "WE", "TH", "FR"];
  } else if (cut(text.match(/\b(?:every\s+day|daily)\b/i))) {
    repeat.freq = "DAILY";
  } else if (cut(text.match(/\b(?:every\s+week|weekly)\b/i))) {
    repeat.freq = "WEEKLY";
  } else if (cut(text.match(/\b(?:every\s+month|monthly)\b/i))) {
    repeat.freq = "MONTHLY";
  }
  return { text, repeat };
}

/** Strip leftover connector words and punctuation from the edges of a title. */
function tidy(s: string): string {
  const edge = /^(?:\s|[-–,:;]|\b(?:on|at|from|starting|beginning|by)\b)+|(?:\s|[-–,:;]|\b(?:on|at|from|starting|beginning|by)\b)+$/gi;
  return s.replace(/\s+/g, " ").replace(edge, "").trim();
}

/**
 * Pick the most specific date in the line, so a word like "Night" in a title
 * doesn't beat "Oct 1 6-8pm".
 */
function bestResult(text: string, ref: Date, forwardDate: boolean) {
  const score = (r: chrono.ParsedResult) =>
    (r.start.isCertain("day") || r.start.isCertain("weekday") ? 4 : 0) +
    (r.start.isCertain("hour") ? 2 : 0) +
    r.text.length / 1000;
  return chrono.parse(text, ref, { forwardDate }).sort((a, b) => score(b) - score(a))[0];
}

function pickDate(text: string, ref: Date) {
  // Explicit dates ("Oct 1") use the nearest year, so a date a few days ago stays this year.
  // Weekday-only dates ("Friday", "next Wed") always mean the upcoming one.
  const nearest = bestResult(text, ref, false);
  if (nearest && !nearest.start.isCertain("day") && nearest.start.isCertain("weekday")) {
    return bestResult(text, ref, true);
  }
  return nearest;
}

// chrono reads a bare "night"/"morning" as a time ("Beer Night" -> tonight), so hide those words
// from it unless they follow a date word ("this morning", "tomorrow evening"). "tonight" still works.
const TIME_OF_DAY = /(?<!\b(?:this|tomorrow|today|in the|on)\s)\b(night|morning|afternoon|evening)\b/gi;
const MASK_START = "";
const MASK_END = "";

function maskTimeOfDay(s: string): { masked: string; words: string[] } {
  const words: string[] = [];
  const masked = s.replace(TIME_OF_DAY, (w) => `${MASK_START}${words.push(w) - 1}${MASK_END}`);
  return { masked, words };
}

function unmask(s: string, words: string[]): string {
  return s.replace(new RegExp(`${MASK_START}(\\d+)${MASK_END}`, "g"), (_, i) => words[Number(i)]);
}

function parseLine(line: string, ref: Date): ProposedEvent | null {
  const { masked, words } = maskTimeOfDay(line.replace(/[–—]/g, "-"));
  const { text, repeat } = extractRepeat(masked, ref);

  const result = pickDate(text, ref);
  let start = result ? result.start.date() : new Date(ref);
  let end = result?.end?.date() ?? null;
  const allDay = !result || !result.start.isCertain("hour");

  let rest = unmask(result ? text.replace(result.text, " ") : text, words);

  // A weekly repeat must start on one of its days, and never before today.
  if (repeat.freq === "WEEKLY" && repeat.days.length) {
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    let shift = 0;
    const startsBeforeToday = () => new Date(start.getTime() + shift * 86_400_000) < today;
    const dayCode = () => (["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const)[new Date(start.getTime() + shift * 86_400_000).getDay()];
    while (shift < 14 && (startsBeforeToday() || !repeat.days.includes(dayCode()))) shift++;
    start = new Date(start.getTime() + shift * 86_400_000);
    if (end) end = new Date(end.getTime() + shift * 86_400_000);
  }

  let location: string | null = null;
  const place = rest.match(/\s(?:in|at|@)\s+([A-Z0-9][^,;]*?)\s*$/);
  if (place) {
    location = place[1].trim();
    rest = rest.slice(0, place.index);
  }

  const title = tidy(rest);
  if (!title) return null;

  return cleanEvent({
    title,
    start: toLocal(start, allDay),
    end: end ? toLocal(end, allDay) : null,
    allDay,
    location,
    category: categorize(title),
    rrule: buildRrule(repeat),
  });
}

export function parseEventsFromText(notes: string, ref = new Date()): ProposedEvent[] {
  return notes
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseLine(line, ref))
    .filter((e): e is ProposedEvent => e !== null);
}
