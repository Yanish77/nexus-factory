import { PageShell } from "@/components/page-shell";
import { mockEvents } from "@/lib/workflows/mock-data";

export default function EventsPage() {
  return (
    <PageShell title="Events" description="Auditable event feed for every mock agent action.">
      <div className="space-y-3">
        {mockEvents.map((event) => (
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
