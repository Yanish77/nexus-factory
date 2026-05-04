import { beforeEach, describe, expect, it } from "vitest";
import { GET as getStatus } from "@/app/api/hermes/status/route";
import { POST as postRun } from "@/app/api/hermes/runs/route";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import {
  getHermesDashboardStatus,
  getHermesDashboardWarnings,
  resetHermesDashboardForTest,
  runHermesDashboardAction,
} from "@/src/lib/hermes/dashboard";
import { resetHermesToolsForTest } from "@/src/lib/hermes/tools";

describe("Hermes dashboard", () => {
  beforeEach(() => {
    resetEventsForTest();
    resetHermesToolsForTest();
    resetHermesDashboardForTest();
    process.env.HERMES_ENABLED = "false";
    process.env.HERMES_API_KEY = "secret-hermes-key";
    process.env.HERMES_API_URL = "http://localhost:8642/v1";
    process.env.HERMES_PUBLIC_DASHBOARD = "false";
  });

  it("returns dashboard status without leaking the Hermes API key", async () => {
    const status = await getHermesDashboardStatus();

    expect(status.enabled).toBe(false);
    expect(JSON.stringify(status)).not.toContain("secret-hermes-key");
  });

  it("warns when Hermes is configured with unsafe public settings", () => {
    process.env.HERMES_ENABLED = "true";
    process.env.HERMES_API_URL = "https://hermes.example.com/v1";
    process.env.HERMES_PUBLIC_DASHBOARD = "true";

    const warnings = getHermesDashboardWarnings();

    expect(warnings).toContain(
      "Hermes API URL is not local. Keep Hermes behind authentication and network protection.",
    );
    expect(warnings).toContain(
      "Hermes public dashboard is enabled. Do not expose Hermes publicly without protection.",
    );
  });

  it("runs dashboard actions through Nexus and logs Deep Comms events", async () => {
    const run = await runHermesDashboardAction("daily_audit");
    expect(run).toBeDefined();
    if (!run) {
      throw new Error("Expected Hermes dashboard run.");
    }
    const events = listEvents(run.id);

    expect(run.status).toBe("completed");
    expect(events.some((event) => event.message.includes("Daily Audit started"))).toBe(true);
    expect(events.some((event) => event.metadata.service === "hermes")).toBe(true);
  });

  it("routes dashboard status through the backend", async () => {
    const response = await getStatus();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.enabled).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("secret-hermes-key");
  });

  it("routes dashboard actions through the backend", async () => {
    const response = await postRun(
      new Request("http://localhost/api/hermes/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "token_cost_review" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.run).toMatchObject({ action: "token_cost_review", status: "completed" });
    expect(listEvents(payload.run.id).length).toBeGreaterThan(0);
  });
});
