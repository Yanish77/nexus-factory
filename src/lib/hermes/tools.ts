import type { AgentKey } from "@/lib/agents/definitions";
import { agents } from "@/lib/agents/definitions";
import { riskyActions, type RiskyAction } from "@/lib/approvals/policy";
import { appendEvent, listEvents } from "@/lib/events/event-log";
import { mockApprovals, mockCosts } from "@/lib/workflows/mock-data";
import type {
  HermesAutonomyLevel,
  HermesToolContext,
  HermesToolName,
  HermesToolResult,
} from "@/src/lib/hermes/types";

export const safeHermesTools: HermesToolName[] = [
  "get_agent_status",
  "get_today_events",
  "get_cost_summary",
  "get_pending_approvals",
  "create_internal_task",
  "create_approval_request",
  "request_ultron_review",
  "pause_agent",
];

export const forbiddenHermesActions = [
  "publish listing",
  "send customer message",
  "refund",
  "spend money",
  "edit production credentials",
  "deploy production",
  "delete data",
  "bypass approvals",
  "change autonomy level above the current allowed level",
] as const;

type InternalTask = {
  id: string;
  title: string;
  description?: string;
  status: "open";
  createdBy: "hermes";
  createdAt: string;
};

type HermesApprovalRequest = {
  id: string;
  actionType: RiskyAction;
  status: "pending";
  summary: string;
  payload: Record<string, unknown>;
  requestedBy: "hermes";
  requiresHumanApproval: true;
  executed: false;
  createdAt: string;
};

type UltronReviewRequest = {
  id: string;
  reason: string;
  target?: string;
  status: "requested";
  requestedBy: "hermes";
  createdAt: string;
};

const autonomyRank: Record<HermesAutonomyLevel, number> = {
  observe: 0,
  assist: 1,
  supervised: 2,
};

const requiredAutonomy: Record<HermesToolName, HermesAutonomyLevel> = {
  get_agent_status: "observe",
  get_today_events: "observe",
  get_cost_summary: "observe",
  get_pending_approvals: "observe",
  create_internal_task: "assist",
  create_approval_request: "assist",
  request_ultron_review: "assist",
  pause_agent: "supervised",
};

const hermesStore = globalThis as typeof globalThis & {
  nexusHermesInternalTasks?: InternalTask[];
  nexusHermesApprovalRequests?: HermesApprovalRequest[];
  nexusHermesUltronReviewRequests?: UltronReviewRequest[];
  nexusHermesPausedAgents?: AgentKey[];
};

function internalTasks() {
  hermesStore.nexusHermesInternalTasks ??= [];
  return hermesStore.nexusHermesInternalTasks;
}

function approvalRequests() {
  hermesStore.nexusHermesApprovalRequests ??= [];
  return hermesStore.nexusHermesApprovalRequests;
}

function ultronReviewRequests() {
  hermesStore.nexusHermesUltronReviewRequests ??= [];
  return hermesStore.nexusHermesUltronReviewRequests;
}

function pausedAgents() {
  hermesStore.nexusHermesPausedAgents ??= [];
  return hermesStore.nexusHermesPausedAgents;
}

export function resetHermesToolsForTest() {
  hermesStore.nexusHermesInternalTasks = [];
  hermesStore.nexusHermesApprovalRequests = [];
  hermesStore.nexusHermesUltronReviewRequests = [];
  hermesStore.nexusHermesPausedAgents = [];
}

function workflowRunId(context?: HermesToolContext) {
  return context?.workflowRunId ?? "wf_hermes_tools";
}

function autonomyLevel(context?: HermesToolContext) {
  return context?.autonomyLevel ?? "observe";
}

function now(context?: HermesToolContext) {
  return (context?.now ?? new Date()).toISOString();
}

function logToolEvent(input: {
  context?: HermesToolContext;
  tool: HermesToolName;
  status: "started" | "completed" | "blocked";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  appendEvent({
    workflowRunId: workflowRunId(input.context),
    type: input.status === "started" ? "task.created" : input.status === "blocked" ? "agent.failed" : "task.completed",
    message: input.message,
    metadata: {
      service: "hermes",
      tool: input.tool,
      status: input.status,
      ...input.metadata,
    },
  });
}

function ok<T>(
  tool: HermesToolName,
  data: T,
  options: {
    executed?: boolean;
    requiresApproval?: boolean;
  } = {},
): HermesToolResult<T> {
  return {
    ok: true,
    tool,
    executed: options.executed ?? false,
    requiresApproval: options.requiresApproval ?? false,
    data,
  };
}

function fail<T = unknown>(tool: HermesToolName, code: string, message: string): HermesToolResult<T> {
  return {
    ok: false,
    tool,
    executed: false,
    requiresApproval: false,
    error: {
      code,
      message,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAgentKey(value: unknown): value is AgentKey {
  return typeof value === "string" && agents.some((agent) => agent.key === value);
}

function isRiskyAction(value: unknown): value is RiskyAction {
  return typeof value === "string" && riskyActions.includes(value as RiskyAction);
}

function validateAutonomy(tool: HermesToolName, context?: HermesToolContext) {
  return autonomyRank[autonomyLevel(context)] >= autonomyRank[requiredAutonomy[tool]];
}

function validateTool(tool: string): tool is HermesToolName {
  return safeHermesTools.includes(tool as HermesToolName);
}

export function getExposedHermesTools() {
  return [...safeHermesTools];
}

export function getForbiddenHermesActions() {
  return [...forbiddenHermesActions];
}

export function executeHermesTool(
  tool: HermesToolName,
  input: unknown = {},
  context?: HermesToolContext,
): HermesToolResult {
  logToolEvent({
    context,
    tool,
    status: "started",
    message: `Hermes tool ${tool} requested.`,
    metadata: { autonomyLevel: autonomyLevel(context) },
  });

  if (!validateAutonomy(tool, context)) {
    const result = fail(
      tool,
      "HERMES_AUTONOMY_TOO_LOW",
      `${tool} requires ${requiredAutonomy[tool]} autonomy.`,
    );
    logToolEvent({
      context,
      tool,
      status: "blocked",
      message: `Hermes tool ${tool} blocked by autonomy policy.`,
      metadata: { requiredAutonomy: requiredAutonomy[tool], autonomyLevel: autonomyLevel(context) },
    });
    return result;
  }

  const result = runTool(tool, input, context);
  logToolEvent({
    context,
    tool,
    status: result.ok ? "completed" : "blocked",
    message: result.ok ? `Hermes tool ${tool} completed.` : `Hermes tool ${tool} failed validation.`,
    metadata: { errorCode: result.error?.code, executed: result.executed },
  });

  return result;
}

export function executeHermesToolByName(
  tool: string,
  input: unknown = {},
  context?: HermesToolContext,
): HermesToolResult {
  if (!validateTool(tool)) {
    return {
      ok: false,
      tool: "get_agent_status",
      executed: false,
      requiresApproval: false,
      error: {
        code: "HERMES_TOOL_NOT_EXPOSED",
        message: `${tool} is not exposed to Hermes.`,
      },
    };
  }

  return executeHermesTool(tool, input, context);
}

function runTool(
  tool: HermesToolName,
  input: unknown,
  context?: HermesToolContext,
): HermesToolResult {
  switch (tool) {
    case "get_agent_status":
      return ok(tool, {
        agents: agents.map((agent) => ({
          key: agent.key,
          name: agent.name,
          role: agent.role,
          defaultModel: agent.defaultModel,
          paused: pausedAgents().includes(agent.key),
        })),
      });
    case "get_today_events": {
      const today = (context?.now ?? new Date()).toISOString().slice(0, 10);
      return ok(tool, {
        events: listEvents().filter((event) => event.createdAt.startsWith(today)),
      });
    }
    case "get_cost_summary":
      return ok(tool, { costs: mockCosts });
    case "get_pending_approvals":
      return ok(tool, {
        approvals: [
          ...mockApprovals,
          ...approvalRequests().filter((approval) => approval.status === "pending"),
        ],
      });
    case "create_internal_task":
      return createInternalTask(tool, input, context);
    case "create_approval_request":
      return createApprovalRequest(tool, input, context);
    case "request_ultron_review":
      return requestUltronReview(tool, input, context);
    case "pause_agent":
      return pauseAgent(tool, input);
  }
}

function createInternalTask(
  tool: HermesToolName,
  input: unknown,
  context?: HermesToolContext,
): HermesToolResult<InternalTask> {
  if (!isObject(input) || typeof input.title !== "string" || input.title.trim().length === 0) {
    return fail(tool, "HERMES_INVALID_INPUT", "title is required.");
  }

  const task: InternalTask = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: typeof input.description === "string" ? input.description : undefined,
    status: "open",
    createdBy: "hermes",
    createdAt: now(context),
  };
  internalTasks().push(task);

  return ok(tool, task);
}

function createApprovalRequest(
  tool: HermesToolName,
  input: unknown,
  context?: HermesToolContext,
): HermesToolResult<HermesApprovalRequest> {
  if (!isObject(input) || !isRiskyAction(input.actionType) || typeof input.summary !== "string") {
    return fail(tool, "HERMES_INVALID_INPUT", "actionType and summary are required.");
  }

  const request: HermesApprovalRequest = {
    id: crypto.randomUUID(),
    actionType: input.actionType,
    status: "pending",
    summary: input.summary,
    payload: isObject(input.payload) ? input.payload : {},
    requestedBy: "hermes",
    requiresHumanApproval: true,
    executed: false,
    createdAt: now(context),
  };
  approvalRequests().push(request);

  return ok(tool, request, {
    requiresApproval: true,
    executed: false,
  });
}

function requestUltronReview(
  tool: HermesToolName,
  input: unknown,
  context?: HermesToolContext,
): HermesToolResult<UltronReviewRequest> {
  if (!isObject(input) || typeof input.reason !== "string" || input.reason.trim().length === 0) {
    return fail(tool, "HERMES_INVALID_INPUT", "reason is required.");
  }

  const request: UltronReviewRequest = {
    id: crypto.randomUUID(),
    reason: input.reason.trim(),
    target: typeof input.target === "string" ? input.target : undefined,
    status: "requested",
    requestedBy: "hermes",
    createdAt: now(context),
  };
  ultronReviewRequests().push(request);

  return ok(tool, request);
}

function pauseAgent(tool: HermesToolName, input: unknown): HermesToolResult {
  if (!isObject(input) || !isAgentKey(input.agentKey)) {
    return fail(tool, "HERMES_INVALID_INPUT", "agentKey is required.");
  }

  const store = pausedAgents();
  if (!store.includes(input.agentKey)) {
    store.push(input.agentKey);
  }

  return ok(tool, {
    agentKey: input.agentKey,
    paused: true,
  });
}
