import { PageShell } from "@/components/page-shell";

const settings = [
  ["Dry-run default", "On"],
  ["Live Etsy calls", "Disabled"],
  ["Live Printify calls", "Disabled"],
  ["Model routing changes", "Require approval"],
  ["Production deploys", "Require approval"],
];

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Phase 1 safety settings and operating constraints.">
      <div className="rounded border border-stone-300 bg-white">
        {settings.map(([label, value]) => (
          <div className="flex justify-between border-b border-stone-200 p-4 last:border-b-0" key={label}>
            <span>{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
