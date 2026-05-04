import { PageShell } from "@/components/page-shell";
import { mockApprovals } from "@/lib/workflows/mock-data";
import { listApprovalRequests } from "@/lib/runtime/store";

export default function ApprovalsPage() {
  const approvals = Array.from(
    new Map([...listApprovalRequests(), ...mockApprovals].map((approval) => [approval.id, approval])).values(),
  );

  return (
    <PageShell title="Approvals" description="Risky actions pause here. Phase 1 never executes live actions.">
      <div className="space-y-3">
        {approvals.map((approval) => (
          <article className="rounded border border-stone-300 bg-white p-4" key={approval.id}>
            <h2 className="font-semibold">{approval.actionType}</h2>
            <p className="mt-2 text-sm text-stone-700">{approval.summary}</p>
            <p className="mt-3 text-sm">Status: {approval.status}</p>
            <p className="mt-1 text-sm text-stone-600">Listing: {approval.listingId}</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
