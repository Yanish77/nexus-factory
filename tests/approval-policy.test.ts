import { describe, expect, it } from "vitest";
import { evaluateApproval, riskyActions } from "@/lib/approvals/policy";

describe("approval policy", () => {
  it("requires human approval for every risky action", () => {
    for (const action of riskyActions) {
      const decision = evaluateApproval(action);

      expect(decision.allowed).toBe(false);
      expect(decision.requiresApproval).toBe(true);
    }
  });
});
