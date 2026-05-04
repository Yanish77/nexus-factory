import { PageShell } from "@/components/page-shell";
import { StatusCard } from "@/components/status-card";
import { DeepCommsFeed } from "@/components/deep-comms-feed";
import { HermesPanel } from "@/components/hermes-panel";
import { agents, mockApprovals, mockCosts, mockEvents, mockWorkflow } from "@/lib/workflows/mock-data";
import { getHermesDashboardStatus } from "@/src/lib/hermes/dashboard";

export default async function DashboardPage() {
  const hermesStatus = await getHermesDashboardStatus();

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

      <DeepCommsFeed initialEvents={mockEvents} />

      <HermesPanel initialStatus={hermesStatus} />

      <section className="rounded border border-stone-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Pending approvals</h2>
        <p className="mt-2 text-sm text-stone-700">{mockApprovals[0]?.summary}</p>
      </section>
    </PageShell>
  );
}
