"use client";

import { CATEGORY_INFO } from "@/lib/colors";
import { CATEGORIES, type CalEvent, type Category } from "@/lib/types";

function formatWhen(e: CalEvent): string {
  if (e.allDay) {
    const d = new Date(`${e.start}T00:00`);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const start = new Date(e.start);
  const end = new Date(e.end);
  const day = start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${t(start)} – ${t(end)}`;
}

interface Props {
  event: CalEvent;
  onClose: () => void;
  onChanged: () => void;
}

export default function EventDetails({ event, onClose, onChanged }: Props) {
  async function setCategory(category: Category) {
    await fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseId: event.baseId, category }),
    });
    onChanged();
    onClose();
  }

  async function remove() {
    const what = event.recurring ? "this event and all its repeats" : "this event";
    if (!confirm(`Delete ${what}?`)) return;
    await fetch(`/api/events?id=${encodeURIComponent(event.baseId)}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()}>
        <h2>{event.title}</h2>
        <p className="muted">
          {formatWhen(event)}
          {event.location && <><br />📍 {event.location}</>}
          <br />From: {event.sourceName}
          {event.recurring && " · repeats"}
        </p>
        <label>Category{event.recurring ? " (applies to all repeats)" : ""}</label>
        <div className="legend">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${c === event.category ? "" : "off"}`}
              onClick={() => setCategory(c)}
            >
              <span className="dot" style={{ background: CATEGORY_INFO[c].color }} />
              {CATEGORY_INFO[c].label}
            </button>
          ))}
        </div>
        <div className="actions">
          {event.source === "manual" && (
            <button className="secondary" style={{ color: "var(--danger)" }} onClick={remove}>
              Delete
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
