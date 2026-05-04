import { describe, expect, it, beforeEach } from "vitest";
import { appendEvent, listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { GET, POST } from "@/app/api/events/route";

describe("event logging", () => {
  beforeEach(() => {
    resetEventsForTest();
  });

  it("creates and lists events through the event service", () => {
    const event = appendEvent({
      workflowRunId: "wf_test",
      agentKey: "ultron",
      type: "agent.started",
      message: "Ultron started a test task.",
      metadata: { dryRun: true },
    });

    const events = listEvents("wf_test");

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(event);
  });

  it("creates internal events through the API route", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({
        workflowRunId: "wf_api",
        agentKey: "qa",
        type: "approval.requested",
        message: "Approval requested for a blocked action.",
        metadata: { actionType: "LIVE_PRODUCT_PUBLISHING" },
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { event: { id: string; type: string } };

    expect(response.status).toBe(201);
    expect(payload.event.id).toBeTruthy();
    expect(payload.event.type).toBe("approval.requested");
    expect(listEvents("wf_api")).toHaveLength(1);
  });

  it("lists events through the API route", async () => {
    appendEvent({
      workflowRunId: "wf_list",
      type: "task.completed",
      message: "Task completed.",
      metadata: {},
    });

    const response = GET(new Request("http://localhost/api/events?workflowRunId=wf_list"));
    const payload = (await response.json()) as { events: Array<{ type: string }> };

    expect(response.status).toBe(200);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].type).toBe("task.completed");
  });

  it("rejects unsupported event types", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({
        workflowRunId: "wf_bad",
        type: "not.real",
        message: "Nope.",
        metadata: {},
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(listEvents("wf_bad")).toHaveLength(0);
  });
});
