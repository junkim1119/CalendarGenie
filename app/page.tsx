"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import EventDetails from "@/components/EventDetails";
import ExportPanel from "@/components/ExportPanel";
import FeedManager from "@/components/FeedManager";
import Legend from "@/components/Legend";
import QuickAdd from "@/components/QuickAdd";
import type { CalEvent, Category, FeedError } from "@/lib/types";

// FullCalendar measures the DOM, so render it only in the browser.
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

export default function Home() {
  const [hidden, setHidden] = useState<Category[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [feedErrors, setFeedErrors] = useState<FeedError[]>([]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const toggle = (c: Category) => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]));

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Combined Calendar</h1>
        <QuickAdd onSaved={refresh} />
        <FeedManager errors={feedErrors} onChange={refresh} />
        <ExportPanel />
      </aside>
      <main className="main">
        {feedErrors.length > 0 && (
          <div className="banner">
            {feedErrors.map((e) => (
              <div key={e.feedId}>
                ⚠️ Couldn&apos;t load <b>{e.name}</b>: {e.message}
              </div>
            ))}
          </div>
        )}
        <Legend hidden={hidden} onToggle={toggle} />
        <Calendar hidden={hidden} refreshKey={refreshKey} onSelect={setSelected} onFeedErrors={setFeedErrors} />
      </main>
      {selected && <EventDetails event={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
    </div>
  );
}
