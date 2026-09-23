"use client";

import { useState } from "react";
import { RRule } from "rrule";
import { CATEGORY_INFO } from "@/lib/colors";
import { CATEGORIES, type Category, type ProposedEvent } from "@/lib/types";

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function describeRepeat(rrule: string): string {
  try {
    return RRule.fromString(`RRULE:${rrule}`).toText();
  } catch {
    return rrule;
  }
}

export default function QuickAdd({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<ProposedEvent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function parse() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timezone: timezone() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      if (data.events.length === 0) return setError("No events found in that text.");
      setProposals(data.events);
    } catch {
      setError("Couldn't reach the app server.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!proposals?.length) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: proposals, timezone: timezone() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setProposals(null);
    setText("");
    onSaved();
  }

  const update = (i: number, patch: Partial<ProposedEvent>) =>
    setProposals((list) => list!.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const toggleAllDay = (i: number, e: ProposedEvent) =>
    update(i, e.allDay
      ? { allDay: false, start: `${e.start}T09:00`, end: `${e.start}T10:00` }
      : { allDay: true, start: e.start.slice(0, 10), end: null });

  return (
    <section className="panel">
      <h2>Type your events</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "CS101 lecture every Tue/Thu 2–3:15pm until Dec 12 in Hall B\nSam's birthday dinner Oct 3 at 7pm\nDentist next Wednesday 9am"
        }
      />
      {!proposals && (
        <div className="actions">
          <button onClick={parse} disabled={busy || !text.trim()}>
            {busy ? "Reading…" : "Create events"}
          </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {proposals && (
        <>
          <p className="muted" style={{ marginTop: 10 }}>
            Check these before adding them:
          </p>
          {proposals.map((e, i) => (
            <div key={i} className="proposal" style={{ borderLeftColor: CATEGORY_INFO[e.category].color }}>
              <div className="row">
                <input value={e.title} onChange={(ev) => update(i, { title: ev.target.value })} />
                <button className="link" onClick={() => setProposals(proposals.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
              <div className="row">
                <input
                  type={e.allDay ? "date" : "datetime-local"}
                  value={e.start}
                  onChange={(ev) => update(i, { start: ev.target.value })}
                  aria-label="Start"
                />
                <input
                  type={e.allDay ? "date" : "datetime-local"}
                  value={e.end ?? ""}
                  onChange={(ev) => update(i, { end: ev.target.value || null })}
                  aria-label={e.allDay ? "Last day" : "End"}
                />
              </div>
              <div className="row">
                <select value={e.category} onChange={(ev) => update(i, { category: ev.target.value as Category })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_INFO[c].label}
                    </option>
                  ))}
                </select>
                <label className="check">
                  <input type="checkbox" checked={e.allDay} onChange={() => toggleAllDay(i, e)} />
                  All day
                </label>
              </div>
              {e.location && <p className="muted">📍 {e.location}</p>}
              {e.rrule && (
                <p className="muted">
                  🔁 Repeats {describeRepeat(e.rrule)}{" "}
                  <button className="link" onClick={() => update(i, { rrule: null })}>
                    make one-time
                  </button>
                </p>
              )}
            </div>
          ))}
          <div className="actions">
            <button onClick={save} disabled={busy || proposals.length === 0}>
              Add {proposals.length} to calendar
            </button>
            <button className="secondary" onClick={() => setProposals(null)}>
              Back to text
            </button>
          </div>
        </>
      )}
    </section>
  );
}
