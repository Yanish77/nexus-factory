import { agents } from "@/lib/agents/definitions";
import { listEvents, type EventRecord } from "@/lib/events/event-log";

export type WorkflowSummary = {
  id: string;
  name: string;
  status: "running" | "waiting_for_approval" | "completed";
  dryRun: boolean;
  progress: number;
};

export const mockWorkflow: WorkflowSummary = {
  id: "wf_phase_1_demo",
  name: "Draft print-on-demand launch",
  status: "running",
  dryRun: true,
  progress: 42,
};

export const mockEvents: EventRecord[] = listEvents(mockWorkflow.id);

export const mockApprovals = [
  {
    id: "approval_publish_demo",
    actionType: "LIVE_PRODUCT_PUBLISHING",
    status: "pending",
    riskLevel: "high",
    summary: "Publishing a product requires human approval. No live action has run.",
  },
];

export const mockCosts = {
  modelCalls: 6,
  estimatedCost: 0.18,
  budgetLimit: 5,
};

export const mockBusinesses = [
  {
    id: "pod_demo",
    name: "Print-on-demand sandbox",
    mode: "Draft-only",
    integrations: ["Mock Etsy", "Mock Printify"],
  },
];

export { agents };
