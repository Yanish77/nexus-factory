import { describe, expect, it } from "vitest";
import { runMockAgentAction } from "@/lib/agents/runtime";

describe("mock agent runtime auditing", () => {
  it("logs events and dry-run tool calls for safe actions", () => {
    const result = runMockAgentAction({
      workflowRunId: "wf_test",
      agentKey: "trend-scout",
      purpose: "mock research",
    });

    expect(result.status).toBe("completed");
    expect(result.toolCall?.dryRun).toBe(true);
    expect(result.events.length).toBeGreaterThanOrEqual(2);
  });

  it("creates an approval event and blocks risky actions", () => {
    const result = runMockAgentAction({
      workflowRunId: "wf_test",
      agentKey: "store-ops",
      purpose: "publish product",
      riskyAction: "LIVE_PRODUCT_PUBLISHING",
    });

    expect(result.status).toBe("blocked");
    expect(result.toolCall).toBeNull();
    expect(result.events.some((event) => event.type === "approval.requested")).toBe(true);
  });
});
