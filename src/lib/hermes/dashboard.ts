import { appendEvent, listEvents } from "@/lib/events/event-log";
import { mockApprovals } from "@/lib/workflows/mock-data";
import { createHermesClient } from "@/src/lib/hermes/client";
import { getHermesConfig } from "@/src/lib/hermes/config";
import { executeHermesTool } from "@/src/lib/hermes/tools";
import type { HermesHealth } from "@/src/lib/hermes/types";

export type HermesDashboardRunAction =
  | "daily_audit"
  | "token_cost_review"
  | "review_pending_approvals"
  | "prepare_ultron_brief"
  | "stop_run";

export type HermesDashboardRun = {
  id: string;
  action: Exclude<HermesDashboardRunAction, "stop_run">;
  label: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  completedAt?: string;
  summary: string;
};

export type HermesDashboardStatus = {
  enabled: boolean;
  apiHealth: HermesHealth;
  lastRun?: HermesDashboardRun;
  activeRun?: HermesDashboardRun;
  latestEvents: ReturnType<typeof listEvents>;
  warnings: string[];
  publicDashboard: boolean;
};

const hermesDashboardStore = globalThis as typeof globalThis & {
  nexusHermesRuns?: HermesDashboardRun[];
};

const actionLabels: Record<Exclude<HermesDashboardRunAction, "stop_run">, string> = {
  daily_audit: "Daily Audit",
  token_cost_review: "Token/Cost Review",
  review_pending_approvals: "Pending Approvals Review",
  prepare_ultron_brief: "Ultron Brief",
};

function runs() {
  hermesDashboardStore.nexusHermesRuns ??= [];
  return hermesDashboardStore.nexusHermesRuns;
}

function nowIso() {
  return new Date().toISOString();
}

function isLocalApiUrl(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function workflowRunId(runId?: string) {
  return runId ?? "wf_hermes_dashboard";
}

function appendHermesDashboardEvent(input: {
  runId?: string;
  type: "task.created" | "task.completed" | "agent.failed" | "approval.requested";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return appendEvent({
    workflowRunId: workflowRunId(input.runId),
    type: input.type,
    message: input.message,
    metadata: {
      service: "hermes",
      surface: "dashboard",
      ...input.metadata,
    },
  });
}

function warningsForConfig(config = getHermesConfig(), env: NodeJS.ProcessEnv = process.env) {
  const warnings: string[] = [];
  const publicDashboard = env.HERMES_PUBLIC_DASHBOARD === "true" || env.HERMES_PUBLIC_DASHBOARD === "1";

  if (config.enabled && !isLocalApiUrl(config.apiUrl)) {
    warnings.push("Hermes API URL is not local. Keep Hermes behind authentication and network protection.");
  }

  if (publicDashboard) {
    warnings.push("Hermes public dashboard is enabled. Do not expose Hermes publicly without protection.");
  }

  return warnings;
}

export function resetHermesDashboardForTest() {
  hermesDashboardStore.nexusHermesRuns = [];
}

export function getHermesDashboardWarnings(env: NodeJS.ProcessEnv = process.env) {
  return warningsForConfig(getHermesConfig(env), env);
}

export async function getHermesDashboardStatus(): Promise<HermesDashboardStatus> {
  const config = getHermesConfig();
  const apiHealth = await createHermesClient({ config }).healthCheck({
    workflowRunId: "wf_hermes_dashboard_health",
  });
  const allRuns = runs();
  const activeRun = allRuns.find((run) => run.status === "running");
  const lastRun = allRuns.find((run) => run.status !== "running") ?? allRuns[0];
  const disconnected =
    config.enabled && (apiHealth.status === "degraded" || apiHealth.status === "unavailable");
  const warnings = warningsForConfig(config);

  if (disconnected) {
    warnings.unshift("Hermes is enabled but the API is disconnected.");
  }

  return {
    enabled: config.enabled,
    apiHealth,
    lastRun,
    activeRun,
    latestEvents: listEvents().filter((event) => event.metadata.service === "hermes").slice(0, 5),
    warnings,
    publicDashboard: process.env.HERMES_PUBLIC_DASHBOARD === "true" || process.env.HERMES_PUBLIC_DASHBOARD === "1",
  };
}

export async function runHermesDashboardAction(action: HermesDashboardRunAction) {
  if (action === "stop_run") {
    return stopHermesDashboardRun();
  }

  const run: HermesDashboardRun = {
    id: crypto.randomUUID(),
    action,
    label: actionLabels[action],
    status: "running",
    startedAt: nowIso(),
    summary: `${actionLabels[action]} started.`,
  };
  runs().unshift(run);

  appendHermesDashboardEvent({
    runId: run.id,
    type: "task.created",
    message: `Hermes ${run.label} started from dashboard.`,
    metadata: { action },
  });

  await performRunAction(run);

  run.status = "completed";
  run.completedAt = nowIso();
  run.summary = `${run.label} completed in dry-run control mode.`;

  appendHermesDashboardEvent({
    runId: run.id,
    type: "task.completed",
    message: `Hermes ${run.label} completed.`,
    metadata: { action, status: run.status },
  });

  return run;
}

async function performRunAction(run: HermesDashboardRun) {
  switch (run.action) {
    case "daily_audit":
      executeHermesTool(
        "create_internal_task",
        { title: "Daily Nexus audit", description: "Review agent status, recent events, and approval posture." },
        { autonomyLevel: "assist", workflowRunId: run.id },
      );
      executeHermesTool(
        "request_ultron_review",
        { reason: "Daily Hermes audit is ready for Ultron review.", target: "dashboard" },
        { autonomyLevel: "assist", workflowRunId: run.id },
      );
      break;
    case "token_cost_review":
      executeHermesTool("get_cost_summary", {}, { autonomyLevel: "observe", workflowRunId: run.id });
      executeHermesTool(
        "create_internal_task",
        { title: "Review token and cost budget", description: "Confirm Hermes cost posture stays under caps." },
        { autonomyLevel: "assist", workflowRunId: run.id },
      );
      break;
    case "review_pending_approvals":
      executeHermesTool("get_pending_approvals", {}, { autonomyLevel: "observe", workflowRunId: run.id });
      appendHermesDashboardEvent({
        runId: run.id,
        type: "approval.requested",
        message: `Hermes reviewed ${mockApprovals.length} pending approval request.`,
        metadata: { approvalCount: mockApprovals.length },
      });
      break;
    case "prepare_ultron_brief":
      executeHermesTool("get_today_events", {}, { autonomyLevel: "observe", workflowRunId: run.id });
      executeHermesTool(
        "request_ultron_review",
        { reason: "Hermes prepared a dashboard brief for Ultron.", target: "ultron" },
        { autonomyLevel: "assist", workflowRunId: run.id },
      );
      break;
  }
}

function stopHermesDashboardRun() {
  const activeRun = runs().find((run) => run.status === "running");

  if (!activeRun) {
    appendHermesDashboardEvent({
      type: "agent.failed",
      message: "Hermes stop requested but no active run was found.",
      metadata: { action: "stop_run" },
    });
    return undefined;
  }

  activeRun.status = "stopped";
  activeRun.completedAt = nowIso();
  activeRun.summary = `${activeRun.label} was stopped from the dashboard.`;
  appendHermesDashboardEvent({
    runId: activeRun.id,
    type: "task.completed",
    message: `Hermes ${activeRun.label} stopped from dashboard.`,
    metadata: { action: "stop_run" },
  });

  return activeRun;
}
