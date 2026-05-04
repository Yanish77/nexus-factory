import type { AgentKey } from "@/lib/agents/definitions";

export type BudgetUsage = {
  modelCalls: number;
  estimatedCost: number;
};

export type BudgetLimit = {
  maxModelCalls: number;
  maxEstimatedCost: number;
};

export const agentBudgetCaps: Record<AgentKey, BudgetLimit> = {
  ultron: {
    maxModelCalls: 50,
    maxEstimatedCost: 10,
  },
  "trend-scout": {
    maxModelCalls: 30,
    maxEstimatedCost: 2,
  },
  "listing-writer": {
    maxModelCalls: 30,
    maxEstimatedCost: 2,
  },
  "design-brief": {
    maxModelCalls: 30,
    maxEstimatedCost: 2,
  },
  qa: {
    maxModelCalls: 25,
    maxEstimatedCost: 2,
  },
  "store-ops": {
    maxModelCalls: 25,
    maxEstimatedCost: 2,
  },
};

export const businessBudgetCaps: Record<string, BudgetLimit> = {
  pod_demo: {
    maxModelCalls: 100,
    maxEstimatedCost: 20,
  },
};

export function checkBudget(usage: BudgetUsage, limit: BudgetLimit) {
  if (usage.modelCalls >= limit.maxModelCalls) {
    return {
      allowed: false,
      reason: "Model call limit reached.",
    };
  }

  if (usage.estimatedCost >= limit.maxEstimatedCost) {
    return {
      allowed: false,
      reason: "Estimated cost limit reached.",
    };
  }

  return {
    allowed: true,
    reason: "Budget available.",
  };
}

export function checkAgentBudget(agentKey: AgentKey, usage: BudgetUsage) {
  return checkBudget(usage, agentBudgetCaps[agentKey]);
}

export function checkBusinessBudget(businessId: string, usage: BudgetUsage) {
  const limit = businessBudgetCaps[businessId];

  if (!limit) {
    return {
      allowed: true,
      reason: "No business budget cap configured.",
    };
  }

  return checkBudget(usage, limit);
}
