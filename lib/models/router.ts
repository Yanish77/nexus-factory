import { findAgent, type AgentKey } from "@/lib/agents/definitions";
import { appendEvent, type EventRecord } from "@/lib/events/event-log";
import {
  checkAgentBudget,
  checkBusinessBudget,
  type BudgetUsage,
} from "@/lib/models/budget";
import type { RiskyAction } from "@/lib/approvals/policy";

export type ModelRoute = {
  agentKey: AgentKey;
  targetAgentKey: AgentKey;
  model: string;
  allowed: boolean;
  requiresApproval: boolean;
  escalatedToUltron: boolean;
  events: EventRecord[];
  reason: string;
};

export const PREMIUM_MODEL = "gpt-5.5";
export const SPECIALIST_DEFAULT_MODEL = "gpt-5.4-mini";
export const CHEAPEST_CONFIGURED_MODEL = "gpt-5.4-mini";
export const LOW_CONFIDENCE_THRESHOLD = 0.65;

export type TaskKind =
  | "classification"
  | "copy"
  | "research"
  | "design"
  | "qa"
  | "ops"
  | "supervision";

export type RouteModelOptions = {
  agentKey: AgentKey;
  requestedModel?: string;
  workflowRunId?: string;
  businessId?: string;
  taskKind?: TaskKind;
  confidence?: number;
  riskyAction?: RiskyAction;
  agentUsage?: BudgetUsage;
  businessUsage?: BudgetUsage;
};

const approvalRequiredActions = new Set<RiskyAction>([
  "SPEND_MONEY",
  "LIVE_PRODUCT_PUBLISHING",
  "REFUND",
  "CUSTOMER_MESSAGE",
  "PRODUCTION_DEPLOY",
]);

function normalizeOptions(agentKeyOrOptions: AgentKey | RouteModelOptions, requestedModel?: string) {
  if (typeof agentKeyOrOptions === "string") {
    return {
      agentKey: agentKeyOrOptions,
      requestedModel,
    } satisfies RouteModelOptions;
  }

  return agentKeyOrOptions;
}

function isSimpleTask(taskKind?: TaskKind) {
  return taskKind === "classification" || taskKind === "copy";
}

function logRoutingEvent(options: RouteModelOptions, route: Omit<ModelRoute, "events">) {
  if (!options.workflowRunId) {
    return [];
  }

  return [
    appendEvent({
      workflowRunId: options.workflowRunId,
      agentKey: route.targetAgentKey,
      type: "model.call.logged",
      message: `Model router selected ${route.model} for ${route.targetAgentKey}.`,
      metadata: {
        requestedAgent: options.agentKey,
        requestedModel: options.requestedModel,
        taskKind: options.taskKind,
        businessId: options.businessId,
        allowed: route.allowed,
        requiresApproval: route.requiresApproval,
        escalatedToUltron: route.escalatedToUltron,
        reason: route.reason,
      },
    }),
  ];
}

function logBudgetEvent(options: RouteModelOptions, targetAgentKey: AgentKey, reason: string) {
  if (!options.workflowRunId) {
    return [];
  }

  return [
    appendEvent({
      workflowRunId: options.workflowRunId,
      agentKey: targetAgentKey,
      type: "budget.limit.hit",
      message: reason,
      metadata: {
        businessId: options.businessId,
        requestedAgent: options.agentKey,
      },
    }),
  ];
}

export function routeModel(agentKey: AgentKey, requestedModel?: string): ModelRoute;
export function routeModel(options: RouteModelOptions): ModelRoute;
export function routeModel(agentKeyOrOptions: AgentKey | RouteModelOptions, requestedModel?: string): ModelRoute {
  const options = normalizeOptions(agentKeyOrOptions, requestedModel);
  const requiresApproval = options.riskyAction ? approvalRequiredActions.has(options.riskyAction) : false;
  const lowConfidence = options.confidence !== undefined && options.confidence < LOW_CONFIDENCE_THRESHOLD;
  const escalatedToUltron = lowConfidence || requiresApproval;
  const targetAgentKey: AgentKey = escalatedToUltron ? "ultron" : options.agentKey;
  const targetAgent = findAgent(targetAgentKey);
  const model =
    options.requestedModel ??
    (isSimpleTask(options.taskKind) && targetAgentKey !== "ultron"
      ? CHEAPEST_CONFIGURED_MODEL
      : targetAgent.defaultModel);

  let allowed = true;
  let reason = "Model route allowed.";

  if (model === PREMIUM_MODEL && !targetAgent.canUsePremiumModel) {
    allowed = false;
    reason = "Only Ultron may use gpt-5.5.";
  }

  if (requiresApproval) {
    allowed = false;
    reason = `${options.riskyAction} requires human approval before model execution.`;
  }

  const budgetEvents: EventRecord[] = [];
  if (allowed && options.agentUsage) {
    const agentBudget = checkAgentBudget(targetAgentKey, options.agentUsage);
    if (!agentBudget.allowed) {
      allowed = false;
      reason = `Agent budget cap hit: ${agentBudget.reason}`;
      budgetEvents.push(...logBudgetEvent(options, targetAgentKey, reason));
    }
  }

  if (allowed && options.businessId && options.businessUsage) {
    const businessBudget = checkBusinessBudget(options.businessId, options.businessUsage);
    if (!businessBudget.allowed) {
      allowed = false;
      reason = `Business budget cap hit: ${businessBudget.reason}`;
      budgetEvents.push(...logBudgetEvent(options, targetAgentKey, reason));
    }
  }

  const routeWithoutEvents = {
    agentKey: options.agentKey,
    targetAgentKey,
    model,
    allowed,
    requiresApproval,
    escalatedToUltron,
    reason,
  };

  return {
    ...routeWithoutEvents,
    events: [...logRoutingEvent(options, routeWithoutEvents), ...budgetEvents],
  };
}
