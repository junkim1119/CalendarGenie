import { buildIcs } from "@/lib/exportIcs";
import { readStore } from "@/lib/store";
import { CATEGORIES, type Category } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET ?id=<event id>            one event as an invite file
 * GET ?categories=social,class  every saved event in those categories
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const { manualEvents } = await readStore();

  const id = params.get("id");
  let events = manualEvents;
  let filename = "calendar-genie";

  if (id) {
    events = manualEvents.filter((e) => e.id === id);
    if (!events.length) return Response.json({ error: "Event not found" }, { status: 404 });
    filename = events[0].title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "event";
  } else {
    const requested: string[] = params.get("categories")?.split(",") ?? CATEGORIES;
    const categories = new Set(requested.filter((c): c is Category => CATEGORIES.includes(c as Category)));
    events = manualEvents.filter((e) => categories.has(e.category));
    if (categories.size < CATEGORIES.length) filename += "-" + [...categories].join("-");
  }

  return new Response(buildIcs(events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.ics"`,
    },
  });
}
