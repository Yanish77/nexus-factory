import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertProductionSafety,
  validateProductionSafety,
} from "@/lib/safety/production";

function productionEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://nexus:secret@postgres:5432/nexus_factory?schema=public",
    REDIS_URL: "redis://redis:6379",
    LIVE_MODE: "false",
    DRY_RUN_DEFAULT: "true",
    HERMES_ENABLED: "false",
    HERMES_PUBLIC_DASHBOARD: "false",
    HERMES_PUBLIC_EXPOSURE_ACK: "false",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("production safety validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses to start in production when required configuration is missing", () => {
    const validation = validateProductionSafety(
      productionEnv({
        DATABASE_URL: "",
        REDIS_URL: "",
        HERMES_ENABLED: "true",
        HERMES_API_KEY: "",
        NEXUS_MCP_TOKEN: "",
      }),
    );

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("DATABASE_URL is required in production.");
    expect(validation.errors).toContain("REDIS_URL is required in production.");
    expect(validation.errors).toContain("HERMES_API_KEY is required in production.");
    expect(validation.errors).toContain("NEXUS_MCP_TOKEN is required in production.");
  });

  it("warns loudly when live mode is enabled", () => {
    const validation = validateProductionSafety(
      productionEnv({
        LIVE_MODE: "true",
        APPROVAL_SYSTEM_ENABLED: "true",
        AUTONOMY_LEVEL: "supervised",
      }),
    );

    expect(validation.ok).toBe(true);
    expect(validation.warnings[0]).toContain("LIVE_MODE=true is enabled");
  });

  it("refuses live mode unless approvals and autonomy are configured", () => {
    const validation = validateProductionSafety(
      productionEnv({
        LIVE_MODE: "true",
      }),
    );

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("LIVE_MODE=true requires APPROVAL_SYSTEM_ENABLED=true.");
    expect(validation.errors).toContain(
      "LIVE_MODE=true requires AUTONOMY_LEVEL to be explicitly configured.",
    );
  });

  it("allows live mode only with approval gates and explicit autonomy", () => {
    const validation = validateProductionSafety(
      productionEnv({
        LIVE_MODE: "true",
        APPROVAL_SYSTEM_ENABLED: "true",
        AUTONOMY_LEVEL: "supervised",
      }),
    );

    expect(validation.ok).toBe(true);
    expect(validation.summary.approvalSystemEnabled).toBe(true);
    expect(validation.summary.autonomyLevel).toBe("supervised");
  });

  it("refuses public Hermes exposure unless explicitly acknowledged", () => {
    const validation = validateProductionSafety(
      productionEnv({
        HERMES_PUBLIC_DASHBOARD: "true",
        HERMES_PUBLIC_URL: "https://hermes.example.com",
      }),
    );

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain(
      "Hermes public exposure requires HERMES_PUBLIC_EXPOSURE_ACK=true.",
    );
  });

  it("logs startup safety configuration without printing secret values", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env = productionEnv({
      DATABASE_URL: "postgresql://nexus:very-secret-password@postgres:5432/nexus_factory",
      HERMES_ENABLED: "true",
      HERMES_API_KEY: "secret-hermes-key",
      NEXUS_MCP_TOKEN: "secret-mcp-token",
    });

    const validation = assertProductionSafety(env);
    const logged = JSON.stringify([
      info.mock.calls,
      warn.mock.calls,
      error.mock.calls,
    ]);

    expect(validation.ok).toBe(true);
    expect(logged).not.toContain("very-secret-password");
    expect(logged).not.toContain("secret-hermes-key");
    expect(logged).not.toContain("secret-mcp-token");
    expect(logged).toContain("requiredConfig");
  });
});
