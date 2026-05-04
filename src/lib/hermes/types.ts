export type HermesConfig = {
  enabled: boolean;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export type HermesRequestOptions = {
  workflowRunId?: string;
  timeoutMs?: number;
};

export type HermesHealthStatus = "disabled" | "healthy" | "degraded" | "unavailable";

export type HermesHealth = {
  status: HermesHealthStatus;
  enabled: boolean;
  apiUrl?: string;
  checkedAt: string;
  latencyMs?: number;
  message: string;
};

export type HermesErrorCode =
  | "HERMES_DISABLED"
  | "HERMES_TIMEOUT"
  | "HERMES_HTTP_ERROR"
  | "HERMES_NETWORK_ERROR"
  | "HERMES_INVALID_RESPONSE";

export type HermesErrorPayload = {
  code: HermesErrorCode;
  message: string;
  status?: number;
  details?: unknown;
};

export type HermesResult<T> =
  | {
      ok: true;
      data: T;
      status: number;
    }
  | {
      ok: false;
      error: HermesErrorPayload;
      status?: number;
    };

export type HermesResponseRequest = {
  model?: string;
  input: unknown;
  instructions?: string;
  metadata?: Record<string, unknown>;
  stream?: boolean;
};

export type HermesResponse = {
  id?: string;
  object?: string;
  model?: string;
  output?: unknown;
  usage?: unknown;
  raw: unknown;
};

export type HermesChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type HermesChatCompletionRequest = {
  model?: string;
  messages: HermesChatMessage[];
  temperature?: number;
  metadata?: Record<string, unknown>;
  stream?: boolean;
};

export type HermesChatCompletion = {
  id?: string;
  object?: string;
  model?: string;
  choices?: unknown;
  usage?: unknown;
  raw: unknown;
};

export type HermesAutonomyLevel = "observe" | "assist" | "supervised";

export type HermesToolName =
  | "get_agent_status"
  | "get_today_events"
  | "get_cost_summary"
  | "get_pending_approvals"
  | "create_internal_task"
  | "create_approval_request"
  | "request_ultron_review"
  | "pause_agent";

export type HermesToolContext = {
  workflowRunId?: string;
  autonomyLevel?: HermesAutonomyLevel;
  now?: Date;
};

export type HermesToolResult<T = unknown> = {
  ok: boolean;
  tool: HermesToolName;
  executed: boolean;
  requiresApproval: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};
