import { PageShell } from "@/components/page-shell";
import { StatusCard } from "@/components/status-card";
import { mockCosts } from "@/lib/workflows/mock-data";
import { listModelCallLogs } from "@/lib/runtime/store";

export default function CostsPage() {
  const modelCalls = listModelCallLogs();

  return (
    <PageShell title="Costs" description="Model routing, logged model calls, and budget limits.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Model calls" value={String(modelCalls.length || mockCosts.modelCalls)} detail="Dry-run calls logged" />
        <StatusCard label="Estimated cost" value={`$${mockCosts.estimatedCost}`} detail="No real billing calls" />
        <StatusCard label="Budget limit" value={`$${mockCosts.budgetLimit}`} detail="Blocks before execution" />
      </div>
    </PageShell>
  );
}
