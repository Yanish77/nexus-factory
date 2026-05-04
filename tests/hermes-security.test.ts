import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDashboardStatus } from "@/app/api/hermes/status/route";
import { GET as getHermesEvents } from "@/app/api/hermes/events/route";
import { GET as getHermesHealth } from "@/app/api/hermes/health/route";
import { agents } from "@/lib/agents/definitions";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { routeModel } from "@/lib/models/router";
import { toolRegistry } from "@/lib/tools/registry";
import {
  executeHermesTool,
  executeHermesToolByName,
  forbiddenHermesActions,
  getExposedHermesTools,
  resetHermesToolsForTest,
} from "@/src/lib/hermes/tools";
import {
  getHermesDashboardStatus,
  resetHermesDashboardForTest,
  runHermesDashboardAction,
} from "@/src/lib/hermes/dashboard";

const clientBundleFiles = [
  "components/hermes-panel.tsx",
  "app/dashboard/page.tsx",
  "app/api/hermes/status/route.ts",
  "app/api/hermes/runs/route.ts",
];

describe("Hermes security and permissions", () => {
  beforeEach(() => {
    resetEventsForTest();
    resetHermesToolsForTest();
    resetHermesDashboardForTest();
    vi.restoreAllMocks();
    process.env.HERMES_ENABLED = "false";
    process.env.HERMES_API_URL = "http://localhost:8642/v1";
    process.env.HERMES_API_KEY = "secret-hermes-key";
    process.env.HERMES_PUBLIC_DASHBOARD = "false";
  });

  it("keeps the app operational when HERMES_ENABLED=false", async () => {
    const status = await getHermesDashboardStatus();
    const routeResponse = await getDashboardStatus();
    const routePayload = await routeResponse.json();

    expect(status.enabled).toBe(false);
    expect(status.apiHealth.status).toBe("disabled");
    expect(routeResponse.status).toBe(200);
    expect(routePayload.enabled).toBe(false);
  });

  it("never exposes the Hermes API key through client-facing dashboard code or payloads", async () => {
    const routeResponse = await getDashboardStatus();
    const routePayload = await routeResponse.json();

    for (const file of clientBundleFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toContain("HERMES_API_KEY");
      expect(content).not.toContain("process.env.HERMES_API_KEY");
    }

    expect(JSON.stringify(routePayload)).not.toContain("secret-hermes-key");
  });

  it("does not expose forbidden Hermes tools", () => {
    for (const forbidden of forbiddenHermesActions) {
      expect(getExposedHermesTools()).not.toContain(forbidden);
    }

    const blocked = executeHermesToolByName("publish listing", {}, { autonomyLevel: "supervised" });
    expect(blocked.ok).toBe(false);
    expect(blocked.executed).toBe(false);
    expect(blocked.error?.code).toBe("HERMES_TOOL_NOT_EXPOSED");
  });

  it("turns Hermes-created risky actions into approval requests, not executed actions", () => {
    const result = executeHermesTool(
      "create_approval_request",
      {
        actionType: "LIVE_PRODUCT_PUBLISHING",
        summary: "Review a mock publish request",
        payload: { listingId: "draft-listing-pod-001" },
      },
      { autonomyLevel: "assist", workflowRunId: "wf_security_approval" },
    );

    expect(result.ok).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.data).toMatchObject({
      status: "pending",
      requestedBy: "hermes",
      requiresHumanApproval: true,
      executed: false,
    });
  });

  it("keeps the dashboard alive when Hermes fails", async () => {
    process.env.HERMES_ENABLED = "true";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Hermes connection refused");
      }),
    );

    const status = await getHermesDashboardStatus();
    const healthResponse = await getHermesHealth();
    const healthPayload = await healthResponse.json();

    expect(status.apiHealth.status).toBe("degraded");
    expect(status.warnings).toContain("Hermes is enabled but the API is disconnected.");
    expect(healthResponse.status).toBe(200);
    expect(healthPayload.health.status).toBe("degraded");
  });

  it("does not allow Hermes to change model routing", () => {
    const blocked = executeHermesToolByName(
      "change_model_routing",
      { agentKey: "trend-scout", model: "gpt-5.5" },
      { autonomyLevel: "supervised" },
    );

    expect(blocked.ok).toBe(false);
    expect(blocked.executed).toBe(false);
    expect(getExposedHermesTools()).not.toContain("change_model_routing");
  });

  it("does not allow non-Ultron agents to use gpt-5.5", () => {
    const nonUltronAgents = agents.filter((agent) => agent.key !== "ultron");

    for (const agent of nonUltronAgents) {
      const route = routeModel({
        agentKey: agent.key,
        requestedModel: "gpt-5.5",
        workflowRunId: `wf_security_model_${agent.key}`,
      });

      expect(route.allowed).toBe(false);
      expect(route.reason).toBe("Only Ultron may use gpt-5.5.");
    }
  });

  it("does not allow Hermes to disable dry-run mode", () => {
    const blockedHermesTool = executeHermesToolByName(
      "disable_dry_run_mode",
      {},
      { autonomyLevel: "supervised" },
    );
    const blockedLiveTool = toolRegistry.execute({
      workflowRunId: "wf_security_dry_run",
      agentKey: "store-ops",
      toolName: "mock_store_ops_draft",
      dryRun: false,
      payload: {},
    });

    expect(blockedHermesTool.ok).toBe(false);
    expect(blockedHermesTool.executed).toBe(false);
    expect(blockedLiveTool.status).toBe("blocked");
  });

  it("does not allow Hermes to raise autonomy level", () => {
    const blockedTool = executeHermesToolByName(
      "raise_autonomy_level",
      { level: "supervised" },
      { autonomyLevel: "assist" },
    );
    const blockedByPolicy = executeHermesTool(
      "pause_agent",
      { agentKey: "trend-scout" },
      { autonomyLevel: "assist" },
    );

    expect(blockedTool.ok).toBe(false);
    expect(blockedTool.executed).toBe(false);
    expect(blockedByPolicy.ok).toBe(false);
    expect(blockedByPolicy.error?.code).toBe("HERMES_AUTONOMY_TOO_LOW");
  });

  it("logs Hermes activity in the event log", async () => {
    await runHermesDashboardAction("daily_audit");
    const eventsResponse = await getHermesEvents();
    const payload = await eventsResponse.json();
    const hermesEvents = listEvents().filter((event) => event.metadata.service === "hermes");

    expect(hermesEvents.length).toBeGreaterThan(0);
    expect(payload.events.length).toBeGreaterThan(0);
    expect(payload.events.every((event: { metadata: Record<string, unknown> }) => event.metadata.service === "hermes")).toBe(
      true,
    );
  });
});
