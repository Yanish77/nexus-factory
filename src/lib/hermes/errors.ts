import type { HermesErrorCode, HermesErrorPayload } from "@/src/lib/hermes/types";

export class HermesClientError extends Error {
  readonly code: HermesErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(payload: HermesErrorPayload) {
    super(payload.message);
    this.name = "HermesClientError";
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
  }

  toPayload(): HermesErrorPayload {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}

export function toHermesErrorPayload(error: unknown): HermesErrorPayload {
  if (error instanceof HermesClientError) {
    return error.toPayload();
  }

  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: "HERMES_TIMEOUT",
      message: "Hermes request timed out.",
    };
  }

  if (error instanceof Error) {
    return {
      code: "HERMES_NETWORK_ERROR",
      message: error.message,
    };
  }

  return {
    code: "HERMES_NETWORK_ERROR",
    message: "Hermes request failed.",
    details: error,
  };
}
