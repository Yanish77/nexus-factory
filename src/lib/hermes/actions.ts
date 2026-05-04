import { appendEvent, listEvents } from "@/lib/events/event-log";
import { createHermesClient } from "@/src/lib/hermes/client";
import { getHermesConfig } from "@/src/lib/hermes/config";
import type { HermesConfig, HermesResponse, HermesResult } from "@/src/lib/hermes/types";

export type HermesBackendAction =
  | "daily_audit"
  | "cost_audit"
  | "approval_review"
  | "ultron_brief";

export type HermesBackendActionResult = {
  ok: boolean;
  action: HermesBackendAction;
  enabled: boolean;
  workflowRunId: string;
  status: "completed" | "disabled" | "failed";
  response?: Pick<HermesResponse, "id" | "model" | "output" | "usage">;
  error?: {
    code: string;
    message: string;
    status?: number;
  };
};

const actionPrompts: Record<HermesBackendAction, { title: string; prompt: string }> = {
  daily_audit: {
    title: "Daily Audit",
    prompt: `Run the Nexus Factory daily audit.

Use Nexus safe tools only:
- get_agent_status
- get_today_events
- get_cost_summary
- get_pending_approvals
- create_internal_task
- create_approval_request
- request_ultron_review

Do not publish, spend money, refund customers, message customers, deploy, change credentials, change model routing, delete data, raise autonomy, or bypass approvals.

Create approval requests or Ultron review requests when needed. Never execute business actions directly.

Return structured JSON with summary, risks, pending approvals, budget status, created tasks, approval requests, Ultron review requests, and next actions.`,
  },
  cost_audit: {
    title: "Token/Cost Review",
    prompt: `Review Nexus Factory token and model cost posture.

Use Nexus safe tools only:
- get_cost_summary
- get_today_events
- create_internal_task
- request_ultron_review

Do not change model routing, raise budgets, spend money, deploy, or bypass approvals.

Return structured JSON with estimated cost, budget status, routing concerns, budget-limit events, created tasks, and whether Ultron review was requested.`,
  },
  approval_review: {
    title: "Pending Approvals Review",
    prompt: `Review Nexus Factory pending approvals.

Use Nexus safe tools only:
- get_pending_approvals
- get_today_events
- create_internal_task
- request_ultron_review

Do not approve, reject, publish, spend money, refund customers, message customers, deploy, change credentials, delete data, or bypass approvals.

Return structured JSON with pending count, approval summaries, risk levels, missing context, created tasks, and Ultron review requests.`,
  },
  ultron_brief: {
    title: "Ultron Brief",
    prompt: `Prepare a Nexus Factory brief for Ultron.

Use Nexus safe tools only:
- get_today_events
- get_agent_status
- get_pending_approvals
- get_cost_summary
- request_ultron_review

Do not make decisions on Ultron's behalf. Do not publish, spend money, refund customers, message customers, deploy, change credentials, delete data, or bypass approvals.

Return structured JSON with key events, risks, approval needs, budget posture, recommended supervisor decisions, and confirmation that Ultron review was requested.`,
  },
};

function workflowRunId(action: HermesBackendAction) {
  return `wf_hermes_${action}_${crypto.randomUUID()}`;
}

function logActionEvent(input: {
  workflowRunId: string;
  type: "task.created" | "task.completed" | "agent.failed";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  appendEvent({
    workflowRunId: input.workflowRunId,
    type: input.type,
    message: input.message,
    metadata: {
      service: "hermes",
      surface: "api",
      ...input.metadata,
    },
  });
}

function safeResponse(result: HermesResult<HermesResponse>) {
  if (!result.ok) {
    return undefined;
  }

  return {
    id: result.data.id,
    model: result.data.model,
    output: result.data.output,
    usage: result.data.usage,
  };
}

function safeError(result: HermesResult<HermesResponse>) {
  if (result.ok) {
    return undefined;
  }

  return {
    code: result.error.code,
    message: result.error.message,
    status: result.error.status,
  };
}

export function getHermesActionPrompt(action: HermesBackendAction) {
  return actionPrompts[action].prompt;
}

export async function runHermesBackendAction(
  action: HermesBackendAction,
  config: HermesConfig = getHermesConfig(),
): Promise<HermesBackendActionResult> {
  const details = actionPrompts[action];
  const runId = workflowRunId(action);

  logActionEvent({
    workflowRunId: runId,
    type: "task.created",
    message: `Hermes ${details.title} API action requested.`,
    metadata: {
      action,
      enabled: config.enabled,
      auth: "not_configured",
      businessActionsExecuted: false,
    },
  });

  const result = await createHermesClient({ config }).createResponse(
    {
      input: details.prompt,
      metadata: {
        nexusAction: action,
        dryRunOnly: true,
        safeToolsOnly: true,
      },
    },
    { workflowRunId: runId },
  );

  const status = result.ok ? "completed" : config.enabled ? "failed" : "disabled";
  logActionEvent({
    workflowRunId: runId,
    type: result.ok ? "task.completed" : config.enabled ? "agent.failed" : "task.completed",
    message: `Hermes ${details.title} API action ${status}.`,
    metadata: {
      action,
      status,
      errorCode: result.ok ? undefined : result.error.code,
      businessActionsExecuted: false,
    },
  });

  return {
    ok: result.ok,
    action,
    enabled: config.enabled,
    workflowRunId: runId,
    status,
    response: safeResponse(result),
    error: safeError(result),
  };
}

export function listHermesEvents() {
  return listEvents().filter((event) => event.metadata.service === "hermes");
}
