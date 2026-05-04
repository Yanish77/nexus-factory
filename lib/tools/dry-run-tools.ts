import type { AgentKey } from "@/lib/agents/definitions";

export type ToolCallRecord = {
  id: string;
  workflowRunId: string;
  agentKey: AgentKey;
  toolName: string;
  dryRun: boolean;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: "completed" | "blocked";
};

export function runDryRunTool(input: {
  workflowRunId: string;
  agentKey: AgentKey;
  toolName: string;
  payload: Record<string, unknown>;
}): ToolCallRecord {
  return {
    id: crypto.randomUUID(),
    workflowRunId: input.workflowRunId,
    agentKey: input.agentKey,
    toolName: input.toolName,
    dryRun: true,
    input: input.payload,
    output: {
      simulated: true,
      message: `${input.toolName} completed in dry-run mode.`,
    },
    status: "completed",
  };
}
