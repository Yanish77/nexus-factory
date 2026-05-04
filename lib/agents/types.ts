import type { z } from "zod";
import type { AgentKey } from "@/lib/agents/definitions";
import type { TaskKind } from "@/lib/models/router";

export type AgentContext = {
  workflowRunId: string;
  businessId?: string;
  dryRun: boolean;
};

export type AgentRunInput = {
  task: string;
  taskKind?: TaskKind;
  confidence?: number;
  requestedModel?: string;
};

export type AgentOutput = {
  summary: string;
  confidence: number;
  artifacts: Record<string, unknown>;
  nextActions: string[];
};

export type Agent = {
  key: AgentKey;
  name: string;
  role: string;
  outputSchema: z.ZodType<AgentOutput>;
  buildPrompt(input: AgentRunInput): string;
};

export type AgentRunStatus = "completed" | "blocked" | "failed";

export type AgentRunRecord = {
  id: string;
  workflowRunId: string;
  agentKey: AgentKey;
  status: AgentRunStatus;
  dryRun: boolean;
  input: AgentRunInput;
  output?: AgentOutput;
  error?: string;
  createdAt: string;
  completedAt?: string;
};

export type ModelCallLogRecord = {
  id: string;
  agentRunId: string;
  workflowRunId: string;
  agentKey: AgentKey;
  model: string;
  provider: "openai-responses";
  dryRun: boolean;
  input: string;
  output: unknown;
  createdAt: string;
};
