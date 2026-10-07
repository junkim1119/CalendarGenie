"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import EventDetails from "@/components/EventDetails";
import ExportPanel from "@/components/ExportPanel";
import Legend from "@/components/Legend";
import QuickAdd from "@/components/QuickAdd";
import type { CalEvent, Category } from "@/lib/types";

// FullCalendar measures the DOM, so render it only in the browser.
const Calendar = dynamic(() => import("@/components/Calendar"), { ssr: false });

export default function Home() {
  const [hidden, setHidden] = useState<Category[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const toggle = (c: Category) => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]));

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>CalendarGenie</h1>
        <QuickAdd onSaved={refresh} />
        <ExportPanel />
      </aside>
      <main className="main">
        <Legend hidden={hidden} onToggle={toggle} />
        <Calendar hidden={hidden} refreshKey={refreshKey} onSelect={setSelected} />
      </main>
      {selected && <EventDetails event={selected} onClose={() => setSelected(null)} onChanged={refresh} />}
    </div>
  );
}
