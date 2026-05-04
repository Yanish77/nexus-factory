import { appendEvent } from "@/lib/events/event-log";
import { getHermesConfig } from "@/src/lib/hermes/config";
import { HermesClientError, toHermesErrorPayload } from "@/src/lib/hermes/errors";
import type {
  HermesChatCompletion,
  HermesChatCompletionRequest,
  HermesConfig,
  HermesHealth,
  HermesRequestOptions,
  HermesResponse,
  HermesResponseRequest,
  HermesResult,
} from "@/src/lib/hermes/types";

type FetchLike = typeof fetch;

type HermesClientOptions = {
  config?: HermesConfig;
  fetchImpl?: FetchLike;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function nowIso() {
  return new Date().toISOString();
}

function latencySince(startedAt: number) {
  return Date.now() - startedAt;
}

function eventWorkflowRunId(options?: HermesRequestOptions) {
  return options?.workflowRunId ?? "wf_hermes";
}

function endpoint(config: HermesConfig, path: string) {
  return `${trimTrailingSlash(config.apiUrl)}${path}`;
}

function summarizePayload(value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return typeof value;
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
    };
  }

  return {
    type: "object",
    keys: Object.keys(value).slice(0, 20),
  };
}

function logHermesEvent(input: {
  workflowRunId: string;
  type: "task.created" | "task.completed" | "agent.failed";
  message: string;
  metadata: Record<string, unknown>;
}) {
  appendEvent({
    workflowRunId: input.workflowRunId,
    type: input.type,
    message: input.message,
    metadata: {
      service: "hermes",
      ...input.metadata,
    },
  });
}

function disabledResult<T>(): HermesResult<T> {
  return {
    ok: false,
    error: {
      code: "HERMES_DISABLED",
      message: "Hermes is disabled.",
    },
  };
}

export class HermesClient {
  private readonly config: HermesConfig;
  private readonly fetchImpl: FetchLike;

  constructor(options: HermesClientOptions = {}) {
    this.config = options.config ?? getHermesConfig();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async healthCheck(options?: HermesRequestOptions): Promise<HermesHealth> {
    const workflowRunId = eventWorkflowRunId(options);

    if (!this.config.enabled) {
      const health = {
        status: "disabled" as const,
        enabled: false,
        checkedAt: nowIso(),
        message: "Hermes is disabled.",
      };

      logHermesEvent({
        workflowRunId,
        type: "task.completed",
        message: "Hermes health check skipped because Hermes is disabled.",
        metadata: { status: health.status },
      });

      return health;
    }

    const startedAt = Date.now();
    const result = await this.request<unknown>("GET", "/health", undefined, options);

    if (!result.ok) {
      return {
        status: result.error.code === "HERMES_TIMEOUT" ? "unavailable" : "degraded",
        enabled: true,
        apiUrl: this.config.apiUrl,
        checkedAt: nowIso(),
        latencyMs: latencySince(startedAt),
        message: result.error.message,
      };
    }

    return {
      status: "healthy",
      enabled: true,
      apiUrl: this.config.apiUrl,
      checkedAt: nowIso(),
      latencyMs: latencySince(startedAt),
      message: "Hermes is healthy.",
    };
  }

  createResponse(
    body: HermesResponseRequest,
    options?: HermesRequestOptions,
  ): Promise<HermesResult<HermesResponse>> {
    return this.request<HermesResponse>("POST", "/responses", body, options, normalizeResponse);
  }

  createChatCompletion(
    body: HermesChatCompletionRequest,
    options?: HermesRequestOptions,
  ): Promise<HermesResult<HermesChatCompletion>> {
    return this.request<HermesChatCompletion>(
      "POST",
      "/chat/completions",
      body,
      options,
      normalizeChatCompletion,
    );
  }

  streamResponsesSupported() {
    return false;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    options?: HermesRequestOptions,
    normalize?: (raw: unknown) => T,
  ): Promise<HermesResult<T>> {
    const workflowRunId = eventWorkflowRunId(options);

    if (!this.config.enabled) {
      logHermesEvent({
        workflowRunId,
        type: "task.completed",
        message: `Hermes ${method} ${path} skipped because Hermes is disabled.`,
        metadata: { method, path, enabled: false },
      });
      return disabledResult<T>();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? this.config.timeoutMs);
    const startedAt = Date.now();

    logHermesEvent({
      workflowRunId,
      type: "task.created",
      message: `Hermes ${method} ${path} request started.`,
      metadata: {
        method,
        path,
        body: summarizePayload(body),
      },
    });

    try {
      const response = await this.fetchImpl(endpoint(this.config, path), {
        method,
        signal: controller.signal,
        headers: this.headers(body !== undefined),
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const raw = await readJson(response);
      if (!response.ok) {
        throw new HermesClientError({
          code: "HERMES_HTTP_ERROR",
          message: `Hermes request failed with status ${response.status}.`,
          status: response.status,
          details: raw,
        });
      }

      const data = normalize ? normalize(raw) : (raw as T);
      logHermesEvent({
        workflowRunId,
        type: "task.completed",
        message: `Hermes ${method} ${path} request completed.`,
        metadata: {
          method,
          path,
          status: response.status,
          latencyMs: latencySince(startedAt),
        },
      });

      return {
        ok: true,
        data,
        status: response.status,
      };
    } catch (error) {
      const payload = toHermesErrorPayload(error);
      logHermesEvent({
        workflowRunId,
        type: "agent.failed",
        message: `Hermes ${method} ${path} request failed: ${payload.message}`,
        metadata: {
          method,
          path,
          status: payload.status,
          code: payload.code,
          latencyMs: latencySince(startedAt),
        },
      });

      return {
        ok: false,
        error: payload,
        status: payload.status,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private headers(hasBody: boolean) {
    const headers: Record<string, string> = {
      accept: "application/json",
    };

    if (hasBody) {
      headers["content-type"] = "application/json";
    }

    if (this.config.apiKey) {
      headers.authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new HermesClientError({
      code: "HERMES_INVALID_RESPONSE",
      message: "Hermes returned invalid JSON.",
      status: response.status,
      details: error instanceof Error ? error.message : error,
    });
  }
}

function normalizeResponse(raw: unknown): HermesResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new HermesClientError({
      code: "HERMES_INVALID_RESPONSE",
      message: "Hermes response payload must be an object.",
      details: raw,
    });
  }

  const record = raw as Record<string, unknown>;
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    object: typeof record.object === "string" ? record.object : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    output: record.output,
    usage: record.usage,
    raw,
  };
}

function normalizeChatCompletion(raw: unknown): HermesChatCompletion {
  if (typeof raw !== "object" || raw === null) {
    throw new HermesClientError({
      code: "HERMES_INVALID_RESPONSE",
      message: "Hermes chat completion payload must be an object.",
      details: raw,
    });
  }

  const record = raw as Record<string, unknown>;
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    object: typeof record.object === "string" ? record.object : undefined,
    model: typeof record.model === "string" ? record.model : undefined,
    choices: record.choices,
    usage: record.usage,
    raw,
  };
}

export function createHermesClient(options?: HermesClientOptions) {
  return new HermesClient(options);
}
