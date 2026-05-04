import { PageShell } from "@/components/page-shell";
import { agents } from "@/lib/workflows/mock-data";

export default function AgentsPage() {
  return (
    <PageShell title="Agents" description="Initial dry-run agent roster and model assignments.">
      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <article className="rounded border border-stone-300 bg-white p-4" key={agent.key}>
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <p className="mt-1 text-sm text-stone-700">{agent.role}</p>
            <p className="mt-3 text-sm">
              Model: <span className="font-mono">{agent.defaultModel}</span>
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
