import { describe, expect, it } from "vitest";
import { checkBudget } from "@/lib/models/budget";

describe("budget limits", () => {
  it("blocks model calls at the call limit", () => {
    const result = checkBudget(
      { modelCalls: 10, estimatedCost: 1 },
      { maxModelCalls: 10, maxEstimatedCost: 5 },
    );

    expect(result.allowed).toBe(false);
  });

  it("blocks model calls at the cost limit", () => {
    const result = checkBudget(
      { modelCalls: 1, estimatedCost: 5 },
      { maxModelCalls: 10, maxEstimatedCost: 5 },
    );

    expect(result.allowed).toBe(false);
  });
});
