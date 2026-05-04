import { beforeEach, describe, expect, it } from "vitest";
import { agents } from "@/lib/agents/definitions";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { CHEAPEST_CONFIGURED_MODEL, routeModel } from "@/lib/models/router";

describe("model routing", () => {
  beforeEach(() => {
    resetEventsForTest();
  });

  it("allows only Ultron to use gpt-5.5", () => {
    expect(routeModel("ultron", "gpt-5.5").allowed).toBe(true);

    const specialists = agents.filter((agent) => agent.key !== "ultron");
    for (const specialist of specialists) {
      expect(routeModel(specialist.key, "gpt-5.5").allowed).toBe(false);
    }
  });

  it("routes specialists to cheaper models by default", () => {
    const specialists = agents.filter((agent) => agent.key !== "ultron");

    for (const specialist of specialists) {
      const route = routeModel(specialist.key);

      expect(route.allowed).toBe(true);
      expect(route.model).not.toBe("gpt-5.5");
    }
  });

  it("uses the cheapest configured model for simple classification and copy tasks", () => {
    expect(routeModel({ agentKey: "qa", taskKind: "classification" }).model).toBe(
      CHEAPEST_CONFIGURED_MODEL,
    );
    expect(routeModel({ agentKey: "listing-writer", taskKind: "copy" }).model).toBe(
      CHEAPEST_CONFIGURED_MODEL,
    );
  });

  it("escalates risky tasks to Ultron and requires approval", () => {
    const route = routeModel({
      agentKey: "store-ops",
      workflowRunId: "wf_route",
      riskyAction: "CUSTOMER_MESSAGE",
    });

    expect(route.allowed).toBe(false);
    expect(route.requiresApproval).toBe(true);
    expect(route.escalatedToUltron).toBe(true);
    expect(route.targetAgentKey).toBe("ultron");
  });

  it("escalates low-confidence tasks to Ultron", () => {
    const route = routeModel({
      agentKey: "trend-scout",
      confidence: 0.4,
    });

    expect(route.escalatedToUltron).toBe(true);
    expect(route.targetAgentKey).toBe("ultron");
    expect(route.model).toBe("gpt-5.5");
  });

  it("logs every routing decision when a workflow is provided", () => {
    const route = routeModel({
      agentKey: "listing-writer",
      workflowRunId: "wf_logged",
      taskKind: "copy",
    });

    const events = listEvents("wf_logged");

    expect(route.events).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("model.call.logged");
  });

  it("blocks routes when agent budget caps are hit", () => {
    const route = routeModel({
      agentKey: "trend-scout",
      workflowRunId: "wf_agent_budget",
      agentUsage: {
        modelCalls: 30,
        estimatedCost: 0,
      },
    });

    expect(route.allowed).toBe(false);
    expect(route.reason).toContain("Agent budget cap hit");
    expect(listEvents("wf_agent_budget").some((event) => event.type === "budget.limit.hit")).toBe(
      true,
    );
  });

  it("blocks routes when business budget caps are hit", () => {
    const route = routeModel({
      agentKey: "qa",
      workflowRunId: "wf_business_budget",
      businessId: "pod_demo",
      businessUsage: {
        modelCalls: 100,
        estimatedCost: 0,
      },
    });

    expect(route.allowed).toBe(false);
    expect(route.reason).toContain("Business budget cap hit");
    expect(
      listEvents("wf_business_budget").some((event) => event.type === "budget.limit.hit"),
    ).toBe(true);
  });
});
