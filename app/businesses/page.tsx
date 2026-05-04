import { PageShell } from "@/components/page-shell";
import { mockBusinesses } from "@/lib/workflows/mock-data";

export default function BusinessesPage() {
  return (
    <PageShell title="Businesses" description="Mock business workflows only. No live Etsy or Printify calls.">
      {mockBusinesses.map((business) => (
        <article className="rounded border border-stone-300 bg-white p-5" key={business.id}>
          <h2 className="text-lg font-semibold">{business.name}</h2>
          <p className="mt-2 text-sm text-stone-700">{business.mode}</p>
          <p className="mt-3 text-sm">Integrations: {business.integrations.join(", ")}</p>
        </article>
      ))}
    </PageShell>
  );
}
