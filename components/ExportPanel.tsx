"use client";

import { useState } from "react";
import { CATEGORY_INFO } from "@/lib/colors";
import { CATEGORIES, type Category } from "@/lib/types";

export default function ExportPanel() {
  const [selected, setSelected] = useState<Category[]>([...CATEGORIES]);
  const [includeFeeds, setIncludeFeeds] = useState(false);

  const toggle = (c: Category) =>
    setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const href = `/api/export?${new URLSearchParams({
    categories: selected.join(","),
    feeds: includeFeeds ? "1" : "0",
  })}`;

  return (
    <section className="panel">
      <h2>Download for Outlook / Google</h2>
      {CATEGORIES.map((c) => (
        <label key={c} className="check">
          <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} />
          <span className="dot" style={{ background: CATEGORY_INFO[c].color, marginRight: 6 }} />
          {CATEGORY_INFO[c].label}
        </label>
      ))}
      <label className="check">
        <input type="checkbox" checked={includeFeeds} onChange={(e) => setIncludeFeeds(e.target.checked)} />
        Also include synced calendar events
      </label>
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
        <b>Google:</b> Settings → Import &amp; export → Import. <b>Outlook:</b> Add calendar → Upload from file.
        Colors don&apos;t carry over in imports, so download one category at a time and import each into its own
        calendar (for example, a blue &quot;Social&quot; calendar). Re-importing into Google updates events instead
        of duplicating them.
      </p>
    </section>
  );
}
