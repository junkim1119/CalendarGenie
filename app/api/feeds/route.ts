import { randomUUID } from "crypto";
import { forgetFeed, normalizeFeedUrl, testFeed } from "@/lib/feeds";
import { readStore, updateStore } from "@/lib/store";
import type { Feed, FeedCategory, Provider } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROVIDERS: Provider[] = ["canvas", "google", "outlook", "other"];
const FEED_CATEGORIES: FeedCategory[] = ["auto", "social", "class", "other"];

export async function GET() {
  const { feeds } = await readStore();
  return Response.json({ feeds });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!/^(https?|webcal):\/\//i.test(url)) {
    return Response.json({ error: "Paste a link that starts with https:// or webcal://" }, { status: 400 });
  }
  const provider: Provider = PROVIDERS.includes(body.provider) ? body.provider : "other";
  const feed: Feed = {
    id: randomUUID(),
    name: (typeof body.name === "string" && body.name.trim()) || provider[0].toUpperCase() + provider.slice(1),
    url: normalizeFeedUrl(url),
    provider,
    defaultCategory: FEED_CATEGORIES.includes(body.defaultCategory) ? body.defaultCategory : "auto",
  };

  let count: number;
  try {
    count = await testFeed(feed.url);
  } catch (err: any) {
    return Response.json({ error: `Couldn't load that calendar: ${err.message}` }, { status: 400 });
  }

  await updateStore((store) => {
    store.feeds.push(feed);
  });
  return Response.json({ feed, eventCount: count });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  await updateStore((store) => {
    const feed = store.feeds.find((f) => f.id === id);
    if (!feed) return;
    forgetFeed(feed.url);
    store.feeds = store.feeds.filter((f) => f.id !== id);
    for (const key of Object.keys(store.categoryOverrides)) {
      if (key.startsWith(`${id}:`)) delete store.categoryOverrides[key];
    }
  });
  return Response.json({ ok: true });
}
