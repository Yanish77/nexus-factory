import { PageShell } from "@/components/page-shell";
import { mockBusinesses, mockDraftListings } from "@/lib/workflows/mock-data";

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
      <section className="rounded border border-stone-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Draft listings</h2>
        <div className="mt-4 space-y-3">
          {mockDraftListings.map((listing) => (
            <article className="border-l-4 border-emerald-600 pl-3" key={listing.id}>
              <p className="font-medium">{listing.title}</p>
              <p className="text-sm text-stone-600">
                {listing.status} · {listing.niche.name}
              </p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
