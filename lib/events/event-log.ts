import type { AgentKey } from "@/lib/agents/definitions";

export type EventRecord = {
  id: string;
  workflowRunId: string;
  agentKey?: AgentKey;
  type: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function createEvent(input: Omit<EventRecord, "id" | "createdAt">): EventRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}
