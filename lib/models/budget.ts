export type BudgetUsage = {
  modelCalls: number;
  estimatedCost: number;
};

export type BudgetLimit = {
  maxModelCalls: number;
  maxEstimatedCost: number;
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
