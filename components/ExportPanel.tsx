"use client";

import { useState } from "react";
import { CATEGORY_INFO } from "@/lib/colors";
import { CATEGORIES, type Category } from "@/lib/types";

export default function ExportPanel() {
  const [selected, setSelected] = useState<Category[]>([...CATEGORIES]);

  const toggle = (c: Category) =>
    setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const href = `/api/export?${new URLSearchParams({ categories: selected.join(",") })}`;

  return (
    <section className="panel">
      <h2>Download all events</h2>
      {CATEGORIES.map((c) => (
        <label key={c} className="check">
          <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} />
          <span className="dot" style={{ background: CATEGORY_INFO[c].color, marginRight: 6 }} />
          {CATEGORY_INFO[c].label}
        </label>
      ))}
      <div className="actions">
        {selected.length > 0 ? (
          <a className="button" href={href} download>
            Download .ics
          </a>
        ) : (
          <button disabled>Download .ics</button>
        )}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        To get one event, click it on the calendar and choose <b>Download invite</b>. Import into Google via Settings →
        Import &amp; export, or into Outlook via Add calendar → Upload from file. Colors don&apos;t carry over, so
        download one category at a time if you want separate colored calendars there.
      </p>
    </section>
  );
}
