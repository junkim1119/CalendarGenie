import { promises as fs } from "fs";
import path from "path";
import type { Store } from "./types";

const FILE = path.join(process.cwd(), "data", "store.json");
const EMPTY: Store = { feeds: [], manualEvents: [], categoryOverrides: {} };

export async function readStore(): Promise<Store> {
  try {
    return { ...structuredClone(EMPTY), ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch (err: any) {
    if (err.code === "ENOENT") return structuredClone(EMPTY);
    throw err;
  }
}

async function writeStore(store: Store) {
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
