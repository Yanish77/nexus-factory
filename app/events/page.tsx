import { PageShell } from "@/components/page-shell";
import { listEventsFromDatabase } from "@/lib/events/event-log";

export default async function EventsPage() {
  const events = await listEventsFromDatabase();

  return (
    <PageShell title="Events" description="Auditable event feed for agent, workflow, and Hermes activity.">
      <div className="space-y-3">
        {events.map((event) => (
          <article className="rounded border border-stone-300 bg-white p-4" key={event.id}>
            <p className="font-medium">{event.message}</p>
            <p className="mt-1 text-sm text-stone-600">
              {event.type} {event.agentKey ? `by ${event.agentKey}` : ""}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
