"use client";

import { useEffect, useState } from "react";
import type { Feed, FeedCategory, FeedError, Provider } from "@/lib/types";

const HELP: Record<Provider, string> = {
  canvas: 'In Canvas, open Calendar and click "Calendar Feed" (bottom right). Copy that link.',
  google:
    'In Google Calendar, open Settings → your calendar → "Integrate calendar" → copy "Secret address in iCal format".',
  outlook:
    'In Outlook on the web: Settings → Calendar → Shared calendars → "Publish a calendar" → pick "Can view all details" → Publish → copy the ICS link.',
  other: "Paste any .ics or webcal:// calendar link.",
};

const DEFAULT_CATEGORY: Record<Provider, FeedCategory> = {
  canvas: "class",
  google: "auto",
  outlook: "auto",
  other: "auto",
};

export default function FeedManager({ errors, onChange }: { errors: FeedError[]; onChange: () => void }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [provider, setProvider] = useState<Provider>("canvas");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<FeedCategory>("class");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/feeds")
      .then((r) => r.json())
      .then((d) => setFeeds(d.feeds));

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, name, url, defaultCategory: category }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setName("");
    setUrl("");
    await load();
    onChange();
  }

  async function remove(id: string) {
    await fetch(`/api/feeds?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
    onChange();
  }

  return (
    <section className="panel">
      <h2>Synced calendars</h2>
      {feeds.length > 0 && (
        <ul className="feed-list">
          {feeds.map((f) => {
            const err = errors.find((x) => x.feedId === f.id);
            return (
              <li key={f.id}>
                <span className="name" title={err?.message}>
                  {err ? "⚠️ " : ""}
                  {f.name} <span className="muted">· {f.provider}</span>
                </span>
                <button className="link" onClick={() => remove(f.id)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add}>
        <div className="row">
          <div>
            <label>Source</label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as Provider;
                setProvider(p);
                setCategory(DEFAULT_CATEGORY[p]);
              }}
            >
              <option value="canvas">Canvas</option>
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label>Color events as</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as FeedCategory)}>
              <option value="auto">Auto (by keywords)</option>
              <option value="class">Class (green)</option>
              <option value="social">Social (blue)</option>
              <option value="other">Other (orange)</option>
            </select>
          </div>
        </div>
        <label>Name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. School Canvas" />
        <label>Feed link</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or webcal://…" required />
        <p className="muted">{HELP[provider]}</p>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="submit" disabled={busy || !url.trim()}>
            {busy ? "Checking link…" : "Add calendar"}
          </button>
        </div>
      </form>
    </section>
  );
}
