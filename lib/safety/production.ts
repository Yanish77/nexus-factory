type SafetyStatus = "pass" | "fail";

export type StartupSafetySummary = {
  nodeEnv: string;
  liveMode: boolean;
  dryRunDefault: boolean;
  approvalSystemEnabled: boolean;
  autonomyLevelConfigured: boolean;
  autonomyLevel: string | null;
  hermesEnabled: boolean;
  hermesPublicDashboard: boolean;
  hermesPublicUrlConfigured: boolean;
  hermesPublicExposureAck: boolean;
  requiredConfig: Record<string, SafetyStatus>;
};

export type StartupSafetyValidation = {
  ok: boolean;
  production: boolean;
  summary: StartupSafetySummary;
  warnings: string[];
  errors: string[];
};

const truthyValues = new Set(["1", "true", "yes", "on"]);

function isTruthy(value: string | undefined) {
  return value !== undefined && truthyValues.has(value.toLowerCase());
}

function hasValue(value: string | undefined) {
  return value !== undefined && value.trim().length > 0;
}

function requiredStatus(env: NodeJS.ProcessEnv, key: string): SafetyStatus {
  return hasValue(env[key]) ? "pass" : "fail";
}

function configuredAutonomyLevel(env: NodeJS.ProcessEnv) {
  return hasValue(env.AUTONOMY_LEVEL) ? env.AUTONOMY_LEVEL!.trim() : null;
}

export function validateProductionSafety(
  env: NodeJS.ProcessEnv = process.env,
): StartupSafetyValidation {
  const production = env.NODE_ENV === "production";
  const liveMode = isTruthy(env.LIVE_MODE);
  const hermesEnabled = isTruthy(env.HERMES_ENABLED);
  const hermesPublicDashboard = isTruthy(env.HERMES_PUBLIC_DASHBOARD);
  const hermesPublicUrlConfigured = hasValue(env.HERMES_PUBLIC_URL);
  const hermesPublicExposureAck = isTruthy(env.HERMES_PUBLIC_EXPOSURE_ACK);
  const autonomyLevel = configuredAutonomyLevel(env);

  const summary: StartupSafetySummary = {
    nodeEnv: env.NODE_ENV ?? "development",
    liveMode,
    dryRunDefault: env.DRY_RUN_DEFAULT === undefined ? true : isTruthy(env.DRY_RUN_DEFAULT),
    approvalSystemEnabled: isTruthy(env.APPROVAL_SYSTEM_ENABLED),
    autonomyLevelConfigured: autonomyLevel !== null,
    autonomyLevel,
    hermesEnabled,
    hermesPublicDashboard,
    hermesPublicUrlConfigured,
    hermesPublicExposureAck,
    requiredConfig: {
      DATABASE_URL: production ? requiredStatus(env, "DATABASE_URL") : "pass",
      REDIS_URL: production ? requiredStatus(env, "REDIS_URL") : "pass",
      HERMES_API_KEY:
        production && hermesEnabled ? requiredStatus(env, "HERMES_API_KEY") : "pass",
      NEXUS_MCP_TOKEN:
        production && hermesEnabled ? requiredStatus(env, "NEXUS_MCP_TOKEN") : "pass",
    },
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  if (liveMode) {
    warnings.push(
      "LIVE_MODE=true is enabled. Nexus Factory may perform real business actions if connectors are available.",
    );
  }

  if (!production) {
    return { ok: true, production, summary, warnings, errors };
  }

  for (const [key, status] of Object.entries(summary.requiredConfig)) {
    if (status === "fail") {
      errors.push(`${key} is required in production.`);
    }
  }

  if (liveMode && !summary.approvalSystemEnabled) {
    errors.push("LIVE_MODE=true requires APPROVAL_SYSTEM_ENABLED=true.");
  }

  if (liveMode && !summary.autonomyLevelConfigured) {
    errors.push("LIVE_MODE=true requires AUTONOMY_LEVEL to be explicitly configured.");
  }

  if ((hermesPublicDashboard || hermesPublicUrlConfigured) && !hermesPublicExposureAck) {
    errors.push(
      "Hermes public exposure requires HERMES_PUBLIC_EXPOSURE_ACK=true.",
    );
  }

  return {
    ok: errors.length === 0,
    production,
    summary,
    warnings,
    errors,
  };
}

export function logStartupSafetyConfiguration(validation: StartupSafetyValidation) {
  console.info("[startup-safety] Configuration", validation.summary);

  for (const warning of validation.warnings) {
    console.warn(`[startup-safety] WARNING: ${warning}`);
  }

  for (const error of validation.errors) {
    console.error(`[startup-safety] REFUSING STARTUP: ${error}`);
  }
}

export function assertProductionSafety(env: NodeJS.ProcessEnv = process.env) {
  const validation = validateProductionSafety(env);
  logStartupSafetyConfiguration(validation);

  if (!validation.ok) {
    throw new Error(`Production safety validation failed: ${validation.errors.join(" ")}`);
  }

  return validation;
}
