"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import type { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { useEffect, useRef } from "react";
import { CATEGORY_INFO } from "@/lib/colors";
import type { CalEvent, Category } from "@/lib/types";

interface Props {
  hidden: Category[];
  refreshKey: number;
  onSelect: (event: CalEvent) => void;
}

export default function Calendar({ hidden, refreshKey, onSelect }: Props) {
  const ref = useRef<FullCalendar>(null);
  // The event source reads this through a ref so it stays stable across renders.
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  useEffect(() => {
    ref.current?.getApi().refetchEvents();
  }, [refreshKey, hidden]);

  const loadEvents = useRef(async (info: EventSourceFuncArg): Promise<EventInput[]> => {
    const qs = new URLSearchParams({ start: info.start.toISOString(), end: info.end.toISOString() });
    const res = await fetch(`/api/events?${qs}`);
    if (!res.ok) throw new Error("Failed to load events");
    const data: { events: CalEvent[] } = await res.json();
    return data.events
      .filter((e) => !hiddenRef.current.includes(e.category))
      .map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        backgroundColor: CATEGORY_INFO[e.category].color,
        borderColor: CATEGORY_INFO[e.category].color,
        textColor: "#fff",
        extendedProps: { calEvent: e },
      }));
  }).current;

  return (
    <FullCalendar
      ref={ref}
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listMonth" }}
      buttonText={{ today: "Today", month: "Month", week: "Week", list: "List" }}
      height="auto"
      dayMaxEvents={4}
      eventDisplay="block"
      nowIndicator
      events={loadEvents}
      eventClick={(arg) => onSelect(arg.event.extendedProps.calEvent as CalEvent)}
    />
  );
}
