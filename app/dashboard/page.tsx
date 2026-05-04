import { PageShell } from "@/components/page-shell";
import { StatusCard } from "@/components/status-card";
import { DeepCommsFeed } from "@/components/deep-comms-feed";
import { HermesPanel } from "@/components/hermes-panel";
import { MissionLauncher } from "@/components/mission-launcher";
import { agents, mockApprovals, mockCosts, mockEvents, mockWorkflow } from "@/lib/workflows/mock-data";
import { getHermesDashboardStatus } from "@/src/lib/hermes/dashboard";
import { listAgentRuns, listTasks } from "@/lib/runtime/store";

export default async function DashboardPage() {
  const hermesStatus = await getHermesDashboardStatus();
  const tasks = listTasks();
  const agentRuns = listAgentRuns();
  const activeTask = tasks.find((task) => task.status === "running" || task.status === "queued");

  return (
    <PageShell
      title="Dashboard"
      description="Phase 1 control room for dry-run AI business workflows."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Workflow" value={activeTask?.status ?? mockWorkflow.status} detail={activeTask?.title ?? mockWorkflow.name} />
        <StatusCard label="Dry-run" value={mockWorkflow.dryRun ? "On" : "Off"} detail="Live actions disabled" />
        <StatusCard label="Agents" value={String(agents.length)} detail={`${agentRuns.length} recorded runs`} />
        <StatusCard label="Budget" value={`$${mockCosts.estimatedCost}`} detail="Mock model spend" />
      </div>

      <MissionLauncher />

      <DeepCommsFeed initialEvents={mockEvents} />

      <HermesPanel initialStatus={hermesStatus} />

      <section className="rounded border border-stone-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Pending approvals</h2>
        <p className="mt-2 text-sm text-stone-700">{mockApprovals[0]?.summary}</p>
      </section>
    </PageShell>
  );
}
