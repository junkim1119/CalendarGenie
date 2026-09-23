import { collectEvents } from "@/lib/events";
import { buildIcs } from "@/lib/exportIcs";
import { readStore } from "@/lib/store";
import { CATEGORIES, type Category } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/**
 * GET ?categories=social,class&feeds=1
 * Typed-in events are exported with their repeat rules; feed events (only with feeds=1)
 * are exported as individual occurrences from one month ago to a year ahead.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const requested: string[] = params.get("categories")?.split(",") ?? CATEGORIES;
  const categories = new Set(requested.filter((c): c is Category => CATEGORIES.includes(c as Category)));
  const includeFeeds = params.get("feeds") === "1";

  const store = await readStore();
  const manual = store.manualEvents.filter((e) => categories.has(e.category));
  let feedEvents: Awaited<ReturnType<typeof collectEvents>>["events"] = [];
  if (includeFeeds) {
    const now = Date.now();
    const { events } = await collectEvents({ ...store, manualEvents: [] }, new Date(now - 31 * DAY), new Date(now + 365 * DAY));
    feedEvents = events.filter((e) => categories.has(e.category));
  }

  const suffix = categories.size === CATEGORIES.length ? "" : "-" + [...categories].join("-");
  return new Response(buildIcs(manual, feedEvents), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="combined-calendar${suffix}.ics"`,
    },
  });
}
