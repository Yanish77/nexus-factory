"use client";

import { useEffect, useState } from "react";
import type { EventRecord } from "@/lib/events/event-log";

export function DeepCommsFeed({ initialEvents }: Readonly<{ initialEvents: EventRecord[] }>) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    let active = true;

    async function pollEvents() {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { events: EventRecord[] };
      if (active) {
        setEvents(payload.events);
      }
    }

    const interval = window.setInterval(pollEvents, 3000);
    void pollEvents();

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="rounded border border-stone-300 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Deep Comms</h2>
          <p className="text-sm text-stone-600">Mock-live event feed polling every few seconds.</p>
        </div>
        <span className="rounded border border-emerald-700 px-2 py-1 text-xs font-semibold text-emerald-800">
          Live mock
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <article className="border-l-4 border-emerald-600 pl-3" key={event.id}>
            <p className="font-medium">{event.message}</p>
            <p className="text-sm text-stone-600">
              {event.type}
              {event.agentKey ? ` by ${event.agentKey}` : ""} · {new Date(event.createdAt).toLocaleTimeString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
