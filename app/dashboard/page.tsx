import { PageShell } from "@/components/page-shell";
import { StatusCard } from "@/components/status-card";
import { agents, mockApprovals, mockCosts, mockEvents, mockWorkflow } from "@/lib/workflows/mock-data";

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Phase 1 control room for dry-run AI business workflows."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Workflow" value={mockWorkflow.status} detail={mockWorkflow.name} />
        <StatusCard label="Dry-run" value={mockWorkflow.dryRun ? "On" : "Off"} detail="Live actions disabled" />
        <StatusCard label="Agents" value={String(agents.length)} detail="Mock roster active" />
        <StatusCard label="Budget" value={`$${mockCosts.estimatedCost}`} detail="Mock model spend" />
      </div>

      <section className="rounded border border-stone-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent events</h2>
        <div className="mt-4 space-y-3">
          {mockEvents.map((event) => (
            <div className="border-l-4 border-emerald-600 pl-3" key={event.id}>
              <p className="font-medium">{event.message}</p>
              <p className="text-sm text-stone-600">{event.type}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-stone-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Pending approvals</h2>
        <p className="mt-2 text-sm text-stone-700">{mockApprovals[0]?.summary}</p>
      </section>
    </PageShell>
  );
}
