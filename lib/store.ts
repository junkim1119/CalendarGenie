import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import type { Store } from "./types";

const EMPTY: Store = { feeds: [], manualEvents: [], categoryOverrides: {} };

// On Vercel the filesystem doesn't persist, so use Upstash Redis when it's configured.
// Vercel's Upstash integration sets KV_REST_API_*; Upstash's own setup uses UPSTASH_REDIS_REST_*.
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const REDIS_KEY = "calendar-genie:store";

const FILE = path.join(process.cwd(), "data", "store.json");

async function load(): Promise<Partial<Store> | null> {
  if (redis) return redis.get<Store>(REDIS_KEY);
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (err: any) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function readStore(): Promise<Store> {
  return { ...structuredClone(EMPTY), ...(await load()) };
}

async function writeStore(store: Store) {
  if (redis) {
    await redis.set(REDIS_KEY, store);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

let queue: Promise<unknown> = Promise.resolve();

/** Read-modify-write, one at a time so concurrent requests don't overwrite each other. */
export function updateStore<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
