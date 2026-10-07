"use client";

import { useState } from "react";
import { categorize } from "@/lib/categorize";
import { CATEGORY_INFO } from "@/lib/colors";
import { parseEventsFromText } from "@/lib/parseText";
import { buildRrule, dayLabel, parseRepeat, WEEKDAYS, type Freq, type Repeat } from "@/lib/repeat";
import { CATEGORIES, type Category, type ProposedEvent } from "@/lib/types";

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function blankEvent(): ProposedEvent {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { title: "", start: `${day}T18:00`, end: `${day}T19:00`, allDay: false, location: null, category: "other", rrule: null };
}

export default function QuickAdd({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<ProposedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function readText() {
    setError("");
    const events = parseEventsFromText(text);
    if (events.length === 0) return setError("Couldn't find any events. Try one event per line, like “Dinner Fri 7pm”.");
    setDrafts((d) => [...d, ...events]);
    setText("");
  }

  async function save() {
    const missing = drafts.findIndex((e) => !e.title.trim() || !e.start);
    if (missing >= 0) return setError(`Event ${missing + 1} needs a title and a date.`);
    setBusy(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: drafts, timezone: timezone() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setDrafts([]);
    onSaved();
  }

  const update = (i: number, patch: Partial<ProposedEvent>) =>
    setDrafts((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const updateRepeat = (i: number, e: ProposedEvent, patch: Partial<Repeat>) => {
    const next = { ...parseRepeat(e.rrule), ...patch };
    // Weekly repeats default to the start date's weekday.
    if (patch.freq === "WEEKLY" && next.days.length === 0) {
      next.days = [WEEKDAYS[new Date(`${e.start.slice(0, 10)}T00:00`).getDay()]];
    }
    update(i, { rrule: buildRrule(next) });
  };

  const toggleAllDay = (i: number, e: ProposedEvent) =>
    update(
      i,
      e.allDay
        ? { allDay: false, start: `${e.start}T09:00`, end: `${e.start}T10:00` }
        : { allDay: true, start: e.start.slice(0, 10), end: null },
    );

  return (
    <section className="panel">
      <h2>Add events</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          "One event per line, e.g.\nChicken Beer Night Oct 1 6-8pm\nCS101 lecture every Tue/Thu 2-3:15pm until Dec 12 in Hall B\nDentist next Wednesday 9am"
        }
      />
      <div className="actions">
        <button onClick={readText} disabled={!text.trim()}>
          Read text
        </button>
        <button className="secondary" onClick={() => setDrafts((d) => [...d, blankEvent()])}>
          + Blank event
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {drafts.map((e, i) => {
        const repeat = parseRepeat(e.rrule);
        return (
          <div key={i} className="proposal" style={{ borderLeftColor: CATEGORY_INFO[e.category].color }}>
            <div className="row">
              <input
                value={e.title}
                placeholder="Title"
                aria-label="Title"
                onChange={(ev) => update(i, { title: ev.target.value })}
                onBlur={() => e.category === "other" && e.title && update(i, { category: categorize(e.title) })}
              />
              <button className="link" title="Remove" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
            <div className="dates">
              <div>
                <label>{e.allDay ? "First day" : "Starts"}</label>
                <input
                  type={e.allDay ? "date" : "datetime-local"}
                  value={e.start}
                  onChange={(ev) => update(i, { start: ev.target.value })}
                />
              </div>
              <div>
                <label>{e.allDay ? "Last day" : "Ends"}</label>
                <input
                  type={e.allDay ? "date" : "datetime-local"}
                  value={e.end ?? ""}
                  onChange={(ev) => update(i, { end: ev.target.value || null })}
                />
              </div>
            </div>
            <div className="row">
              <input
                value={e.location ?? ""}
                placeholder="Location (optional)"
                aria-label="Location"
                onChange={(ev) => update(i, { location: ev.target.value || null })}
              />
            </div>
            <div className="row">
              <select
                aria-label="Category"
                value={e.category}
                onChange={(ev) => update(i, { category: ev.target.value as Category })}
              >
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
            <div className="row">
              <select
                aria-label="Repeat"
                value={repeat.freq}
                onChange={(ev) => updateRepeat(i, e, { freq: ev.target.value as Freq })}
              >
                <option value="none">Doesn&apos;t repeat</option>
                <option value="DAILY">Every day</option>
                <option value="WEEKLY">Every week</option>
                <option value="MONTHLY">Every month</option>
              </select>
              {repeat.freq !== "none" && (
                <input
                  type="date"
                  aria-label="Repeat until"
                  title="Repeat until (optional)"
                  value={repeat.until ?? ""}
                  onChange={(ev) => updateRepeat(i, e, { until: ev.target.value || null })}
                />
              )}
            </div>
            {repeat.freq === "WEEKLY" && (
              <div className="days">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`day-toggle ${repeat.days.includes(d) ? "on" : ""}`}
                    onClick={() =>
                      updateRepeat(i, e, {
                        days: repeat.days.includes(d) ? repeat.days.filter((x) => x !== d) : [...repeat.days, d],
                      })
                    }
                  >
                    {dayLabel(d)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {drafts.length > 0 && (
        <div className="actions">
          <button onClick={save} disabled={busy}>
            Save {drafts.length} {drafts.length === 1 ? "event" : "events"}
          </button>
          <button className="secondary" onClick={() => setDrafts([])}>
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
