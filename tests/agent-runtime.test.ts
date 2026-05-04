import { beforeEach, describe, expect, it } from "vitest";
import { agentRegistry } from "@/lib/agents/registry";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { routeModel } from "@/lib/models/router";
import { runAgent } from "@/lib/agents/runtime";
import { toolRegistry } from "@/lib/tools/registry";

describe("agent runtime", () => {
  beforeEach(() => {
    resetEventsForTest();
  });

  it("registers all initial agents", () => {
    expect(agentRegistry.list().map((agent) => agent.key).sort()).toEqual([
      "design-brief",
      "listing-writer",
      "qa",
      "store-ops",
      "trend-scout",
      "ultron",
    ]);
  });

  it("runs an agent in dry-run mode with validated structured output", () => {
    const result = runAgent({
      workflowRunId: "wf_agent_runtime",
      agentKey: "trend-scout",
      runInput: {
        task: "Find mock POD trends",
        taskKind: "research",
      },
    });

    expect(result.agentRun.status).toBe("completed");
    expect(result.agentRun.dryRun).toBe(true);
    expect(result.output?.summary).toContain("trend-scout");
    expect(result.output?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.modelCallLog?.provider).toBe("openai-responses");
    expect(result.modelCallLog?.dryRun).toBe(true);
  });

  it("logs every agent run and model routing decision as events", () => {
    runAgent({
      workflowRunId: "wf_event_runtime",
      agentKey: "listing-writer",
      runInput: {
        task: "Draft mock listing copy",
        taskKind: "copy",
      },
    });

    const events = listEvents("wf_event_runtime");

    expect(events.some((event) => event.type === "agent.started")).toBe(true);
    expect(events.some((event) => event.type === "model.call.logged")).toBe(true);
    expect(events.some((event) => event.type === "agent.completed")).toBe(true);
  });

  it("blocks risky actions and requests approval instead of executing", () => {
    const result = runAgent({
      workflowRunId: "wf_blocked_runtime",
      agentKey: "store-ops",
      riskyAction: "LIVE_PRODUCT_PUBLISHING",
      runInput: {
        task: "Publish a product",
        taskKind: "ops",
      },
    });

    expect(result.agentRun.status).toBe("blocked");
    expect(result.modelCallLog).toBeUndefined();
    expect(result.events.some((event) => event.type === "approval.requested")).toBe(true);
  });

  it("does not allow non-Ultron agents to use gpt-5.5", () => {
    const route = routeModel({
      agentKey: "qa",
      requestedModel: "gpt-5.5",
    });

    expect(route.allowed).toBe(false);
    expect(route.reason).toContain("Only Ultron");
  });

  it("blocks live publishing tools even when called directly", () => {
    const result = toolRegistry.execute({
      workflowRunId: "wf_tool_block",
      agentKey: "store-ops",
      toolName: "live_publish_product",
      dryRun: true,
      payload: {
        listingId: "mock-listing",
      },
    });

    expect(result.status).toBe("blocked");
    expect(result.toolCall.status).toBe("blocked");
  });
});
