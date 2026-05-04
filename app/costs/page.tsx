import { PageShell } from "@/components/page-shell";
import { StatusCard } from "@/components/status-card";
import { mockCosts } from "@/lib/workflows/mock-data";

export default function CostsPage() {
  return (
    <PageShell title="Costs" description="Mock cost controls for model routing and budget limits.">
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard label="Model calls" value={String(mockCosts.modelCalls)} detail="Mocked calls logged" />
        <StatusCard label="Estimated cost" value={`$${mockCosts.estimatedCost}`} detail="No real billing calls" />
        <StatusCard label="Budget limit" value={`$${mockCosts.budgetLimit}`} detail="Blocks before execution" />
      </div>
    </PageShell>
  );
}
