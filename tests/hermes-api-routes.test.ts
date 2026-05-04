import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postDailyAudit } from "@/app/api/hermes/audit/daily/route";
import { POST as postCostAudit } from "@/app/api/hermes/audit/costs/route";
import { POST as postApprovalReview } from "@/app/api/hermes/review/approvals/route";
import { POST as postUltronBrief } from "@/app/api/hermes/ultron-brief/route";
import { GET as getHermesHealth } from "@/app/api/hermes/health/route";
import { GET as getHermesEvents } from "@/app/api/hermes/events/route";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { getHermesActionPrompt } from "@/src/lib/hermes/actions";

function mockHermesResponses() {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "GET") {
      return Response.json({ status: "ok" });
    }

    return Response.json({
      id: "resp_test",
      model: "hermes-test",
      output: [{ type: "json", json: { status: "ok" } }],
      usage: { input_tokens: 12, output_tokens: 8 },
    });
  });
}

describe("Hermes backend API routes", () => {
  beforeEach(() => {
    resetEventsForTest();
    vi.restoreAllMocks();
    process.env.HERMES_ENABLED = "true";
    process.env.HERMES_API_URL = "http://hermes.local/v1";
    process.env.HERMES_API_KEY = "secret-hermes-key";
    process.env.HERMES_TIMEOUT_MS = "1000";
  });

  it("keeps the daily audit prompt restricted to safe tools and approval gates", () => {
    const prompt = getHermesActionPrompt("daily_audit");

    expect(prompt).toContain("Use Nexus safe tools only");
    expect(prompt).toContain("Do not publish, spend money, refund customers, message customers, deploy");
    expect(prompt).toContain("Create approval requests or Ultron review requests when needed");
    expect(prompt).toContain("Never execute business actions directly");
  });

  it("runs daily audit through the server-side Hermes client without leaking secrets", async () => {
    const fetchMock = mockHermesResponses();
    vi.stubGlobal("fetch", fetchMock);

    const response = await postDailyAudit();
    const payload = await response.json();
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      input: string;
      metadata: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      action: "daily_audit",
      enabled: true,
      status: "completed",
    });
    expect(JSON.stringify(payload)).not.toContain("secret-hermes-key");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://hermes.local/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer secret-hermes-key",
        }),
      }),
    );
    expect(requestBody.metadata).toMatchObject({ dryRunOnly: true, safeToolsOnly: true });
    expect(requestBody.input).toContain("Do not publish");
    expect(listEvents(payload.workflowRunId).some((event) => event.metadata.service === "hermes")).toBe(
      true,
    );
  });

  it("returns disabled structured JSON without calling Hermes", async () => {
    const fetchMock = mockHermesResponses();
    vi.stubGlobal("fetch", fetchMock);
    process.env.HERMES_ENABLED = "false";

    const response = await postCostAudit();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: false,
      action: "cost_audit",
      enabled: false,
      status: "disabled",
      error: { code: "HERMES_DISABLED" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(payload)).not.toContain("secret-hermes-key");
  });

  it("supports approval review and Ultron brief routes", async () => {
    const fetchMock = mockHermesResponses();
    vi.stubGlobal("fetch", fetchMock);

    const approvalResponse = await postApprovalReview();
    const briefResponse = await postUltronBrief();
    const approvalPayload = await approvalResponse.json();
    const briefPayload = await briefResponse.json();

    expect(approvalPayload).toMatchObject({ ok: true, action: "approval_review" });
    expect(briefPayload).toMatchObject({ ok: true, action: "ultron_brief" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("checks Hermes health through the server-side client", async () => {
    const fetchMock = mockHermesResponses();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getHermesHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      enabled: true,
      health: { status: "healthy" },
    });
    expect(JSON.stringify(payload)).not.toContain("secret-hermes-key");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://hermes.local/v1/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("lists Hermes events and keeps the response secret-free", async () => {
    const fetchMock = mockHermesResponses();
    vi.stubGlobal("fetch", fetchMock);

    await postDailyAudit();
    const response = await getHermesEvents();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.events.length).toBeGreaterThan(0);
    expect(payload.events.every((event: { metadata: Record<string, unknown> }) => event.metadata.service === "hermes")).toBe(
      true,
    );
    expect(JSON.stringify(payload)).not.toContain("secret-hermes-key");
  });
});
