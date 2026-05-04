"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HermesDashboardRun,
  HermesDashboardRunAction,
  HermesDashboardStatus,
} from "@/src/lib/hermes/dashboard";

type ActionButton = {
  action: HermesDashboardRunAction;
  label: string;
};

const actionButtons: ActionButton[] = [
  { action: "daily_audit", label: "Run Daily Audit" },
  { action: "token_cost_review", label: "Run Token/Cost Review" },
  { action: "review_pending_approvals", label: "Review Pending Approvals" },
  { action: "prepare_ultron_brief", label: "Prepare Ultron Brief" },
  { action: "stop_run", label: "Stop Hermes Run" },
];

export function HermesPanel({
  initialStatus,
}: Readonly<{
  initialStatus: HermesDashboardStatus;
}>) {
  const [status, setStatus] = useState(initialStatus);
  const [pendingAction, setPendingAction] = useState<HermesDashboardRunAction | undefined>();

  async function refreshStatus() {
    const response = await fetch("/api/hermes/status", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    setStatus((await response.json()) as HermesDashboardStatus);
  }

  async function runAction(action: HermesDashboardRunAction) {
    setPendingAction(action);
    try {
      await fetch("/api/hermes/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refreshStatus();
    } finally {
      setPendingAction(undefined);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(refreshStatus, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const healthLabel = useMemo(() => {
    if (!status.enabled) {
      return "Disabled";
    }

    return status.apiHealth.status.charAt(0).toUpperCase() + status.apiHealth.status.slice(1);
  }, [status.apiHealth.status, status.enabled]);

  return (
    <section className="rounded border border-stone-300 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Hermes</h2>
          <p className="text-sm text-stone-600">Optional operations sidecar for audits and briefs.</p>
        </div>
        <span className="rounded border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700">
          {status.enabled ? "Enabled" : "Disabled"} · {healthLabel}
        </span>
      </div>

      {status.warnings.length > 0 ? (
        <div className="mt-4 space-y-3">
          {status.warnings.map((warning) => (
            <p className="rounded border border-amber-600 bg-amber-50 p-3 text-sm text-amber-900" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <HermesRunSummary label="API health" value={status.apiHealth.message} />
        <HermesRunSummary label="Last run" value={runSummary(status.lastRun)} />
        <HermesRunSummary label="Active run" value={runSummary(status.activeRun)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actionButtons.map((button) => (
          <button
            className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-100"
            disabled={pendingAction !== undefined || (button.action === "stop_run" && !status.activeRun)}
            key={button.action}
            onClick={() => void runAction(button.action)}
            type="button"
          >
            {pendingAction === button.action ? "Running..." : button.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-semibold">Latest Hermes Events</h3>
        {status.latestEvents.length > 0 ? (
          status.latestEvents.map((event) => (
            <article className="border-l-4 border-emerald-600 pl-3" key={event.id}>
              <p className="font-medium">{event.message}</p>
              <p className="text-sm text-stone-600">
                {event.type} · {new Date(event.createdAt).toLocaleTimeString()}
              </p>
            </article>
          ))
        ) : (
          <p className="text-sm text-stone-600">No Hermes activity yet.</p>
        )}
      </div>
    </section>
  );
}

function HermesRunSummary({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded border border-stone-200 p-4">
      <p className="text-xs font-semibold text-stone-600">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function runSummary(run?: HermesDashboardRun) {
  if (!run) {
    return "None";
  }

  return `${run.label}: ${run.status}`;
}
