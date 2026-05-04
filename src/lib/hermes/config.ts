import type { HermesConfig } from "@/src/lib/hermes/types";

const defaultHermesApiUrl = "http://localhost:8642/v1";
const defaultTimeoutMs = 5000;

function isEnabled(value: string | undefined) {
  return value === "true" || value === "1";
}

function parseTimeout(value: string | undefined) {
  if (!value) {
    return defaultTimeoutMs;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultTimeoutMs;
}

export function getHermesConfig(env: NodeJS.ProcessEnv = process.env): HermesConfig {
  return {
    enabled: isEnabled(env.HERMES_ENABLED),
    apiUrl: env.HERMES_API_URL ?? defaultHermesApiUrl,
    apiKey: env.HERMES_API_KEY || undefined,
    timeoutMs: parseTimeout(env.HERMES_TIMEOUT_MS),
  };
}
