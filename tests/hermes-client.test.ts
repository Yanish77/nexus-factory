import { beforeEach, describe, expect, it, vi } from "vitest";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import { createHermesClient } from "@/src/lib/hermes/client";
import { getHermesConfig } from "@/src/lib/hermes/config";
import type { HermesConfig } from "@/src/lib/hermes/types";

const enabledConfig: HermesConfig = {
  enabled: true,
  apiUrl: "http://hermes.local/v1",
  apiKey: "test-hermes-key",
  timeoutMs: 50,
};

describe("Hermes client", () => {
  beforeEach(() => {
    resetEventsForTest();
    vi.restoreAllMocks();
  });

  it("uses disabled mode without calling Hermes", async () => {
    const fetchImpl = vi.fn();
    const client = createHermesClient({
      config: {
        ...enabledConfig,
        enabled: false,
      },
      fetchImpl,
    });

    const health = await client.healthCheck({ workflowRunId: "wf_hermes_disabled" });
    const result = await client.createResponse(
      {
        input: "Run a local audit",
      },
      { workflowRunId: "wf_hermes_disabled" },
    );

    expect(health.status).toBe("disabled");
    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.error.code).toBe("HERMES_DISABLED");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(listEvents("wf_hermes_disabled").map((event) => event.metadata.service)).toContain(
      "hermes",
    );
  });

  it("checks Hermes health with bearer auth", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ status: "ok" }));
    const client = createHermesClient({
      config: enabledConfig,
      fetchImpl,
    });

    const health = await client.healthCheck({ workflowRunId: "wf_hermes_health" });

    expect(health.status).toBe("healthy");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://hermes.local/v1/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer test-hermes-key",
        }),
      }),
    );
  });

  it("posts to /v1/responses and normalizes the response", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: "resp_123",
        object: "response",
        model: "hermes-preview",
        output: [{ text: "Audit complete" }],
      }),
    );
    const client = createHermesClient({
      config: enabledConfig,
      fetchImpl,
    });

    const result = await client.createResponse(
      {
        model: "hermes-preview",
        input: "Summarize current activity",
      },
      { workflowRunId: "wf_hermes_response" },
    );

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data.id : undefined).toBe("resp_123");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://hermes.local/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-hermes-key",
          "content-type": "application/json",
        }),
      }),
    );
    expect(listEvents("wf_hermes_response").some((event) => event.type === "task.completed")).toBe(
      true,
    );
  });

  it("supports chat completions when needed", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        id: "chat_123",
        choices: [{ message: { content: "Reviewed" } }],
      }),
    );
    const client = createHermesClient({
      config: enabledConfig,
      fetchImpl,
    });

    const result = await client.createChatCompletion({
      messages: [{ role: "user", content: "Review this run" }],
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://hermes.local/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("returns structured HTTP errors and logs failed requests", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          error: "bad request",
        },
        { status: 400 },
      ),
    );
    const client = createHermesClient({
      config: enabledConfig,
      fetchImpl,
    });

    const result = await client.createResponse(
      {
        input: "Bad request",
      },
      { workflowRunId: "wf_hermes_error" },
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.error.code).toBe("HERMES_HTTP_ERROR");
    expect(result.status).toBe(400);
    expect(listEvents("wf_hermes_error").some((event) => event.type === "agent.failed")).toBe(
      true,
    );
  });

  it("returns degraded health instead of throwing when Hermes is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });
    const client = createHermesClient({
      config: enabledConfig,
      fetchImpl,
    });

    const health = await client.healthCheck();

    expect(health.status).toBe("degraded");
    expect(health.message).toBe("connection refused");
  });

  it("handles request timeouts", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );
    const client = createHermesClient({
      config: {
        ...enabledConfig,
        timeoutMs: 1,
      },
      fetchImpl,
    });

    const result = await client.createResponse({ input: "Timeout" });

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.error.code).toBe("HERMES_TIMEOUT");
  });

  it("reads configuration from environment without exposing a browser API", () => {
    const config = getHermesConfig({
      HERMES_ENABLED: "true",
      HERMES_API_URL: "http://localhost:8642/v1",
      HERMES_API_KEY: "local-only",
      HERMES_TIMEOUT_MS: "1234",
    } as unknown as NodeJS.ProcessEnv);

    expect(config).toEqual({
      enabled: true,
      apiUrl: "http://localhost:8642/v1",
      apiKey: "local-only",
      timeoutMs: 1234,
    });
  });
});
