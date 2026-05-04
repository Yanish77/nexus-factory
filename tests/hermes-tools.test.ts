import { beforeEach, describe, expect, it } from "vitest";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { POST } from "@/app/api/hermes/tools/[tool]/route";
import {
  executeHermesTool,
  executeHermesToolByName,
  forbiddenHermesActions,
  getExposedHermesTools,
  resetHermesToolsForTest,
  safeHermesTools,
} from "@/src/lib/hermes/tools";

describe("Hermes safe Nexus tool layer", () => {
  beforeEach(() => {
    resetEventsForTest();
    resetHermesToolsForTest();
    process.env.NEXUS_MCP_TOKEN = "test-token";
  });

  it("exposes only the approved safe tools", () => {
    expect(getExposedHermesTools().sort()).toEqual([...safeHermesTools].sort());

    for (const forbidden of forbiddenHermesActions) {
      expect(getExposedHermesTools()).not.toContain(forbidden);
    }
  });

  it("does not expose forbidden tool names", () => {
    const result = executeHermesToolByName("publish listing", {}, { autonomyLevel: "supervised" });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("HERMES_TOOL_NOT_EXPOSED");
    expect(result.executed).toBe(false);
  });

  it("returns agent status with safe read-only data", () => {
    const result = executeHermesTool("get_agent_status", {}, { workflowRunId: "wf_status" });

    expect(result.ok).toBe(true);
    expect(result.executed).toBe(false);
    expect(JSON.stringify(result.data)).toContain("Ultron");
    expect(listEvents("wf_status").some((event) => event.metadata.service === "hermes")).toBe(
      true,
    );
  });

  it("enforces autonomy before mutating internal state", () => {
    const blocked = executeHermesTool(
      "create_internal_task",
      { title: "Audit model routes" },
      { autonomyLevel: "observe", workflowRunId: "wf_autonomy" },
    );
    const allowed = executeHermesTool(
      "create_internal_task",
      { title: "Audit model routes" },
      { autonomyLevel: "assist", workflowRunId: "wf_autonomy" },
    );

    expect(blocked.ok).toBe(false);
    expect(blocked.error?.code).toBe("HERMES_AUTONOMY_TOO_LOW");
    expect(allowed.ok).toBe(true);
    expect(allowed.executed).toBe(false);
  });

  it("validates inputs", () => {
    const result = executeHermesTool("request_ultron_review", {}, { autonomyLevel: "assist" });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("HERMES_INVALID_INPUT");
  });

  it("creates approval requests without executing the requested action", () => {
    const result = executeHermesTool(
      "create_approval_request",
      {
        actionType: "LIVE_PRODUCT_PUBLISHING",
        summary: "Review mock listing publish request",
        payload: { listingId: "draft-listing-pod-001" },
      },
      { autonomyLevel: "assist", workflowRunId: "wf_approval_gate" },
    );

    expect(result.ok).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.data).toMatchObject({
      status: "pending",
      requiresHumanApproval: true,
      executed: false,
      requestedBy: "hermes",
    });
  });

  it("requires supervised autonomy to pause an agent", () => {
    const blocked = executeHermesTool(
      "pause_agent",
      { agentKey: "trend-scout" },
      { autonomyLevel: "assist" },
    );
    const allowed = executeHermesTool(
      "pause_agent",
      { agentKey: "trend-scout" },
      { autonomyLevel: "supervised" },
    );

    expect(blocked.ok).toBe(false);
    expect(allowed.ok).toBe(true);
    expect(allowed.data).toMatchObject({ agentKey: "trend-scout", paused: true });
  });

  it("authenticates REST tool requests with NEXUS_MCP_TOKEN", async () => {
    const unauthorized = await POST(
      new Request("http://localhost/api/hermes/tools/get_agent_status", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ tool: "get_agent_status" }) },
    );

    const authorized = await POST(
      new Request("http://localhost/api/hermes/tools/get_agent_status", {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ workflowRunId: "wf_route_auth" }),
      }),
      { params: Promise.resolve({ tool: "get_agent_status" }) },
    );

    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toMatchObject({ ok: true });
  });
});
