import type { AgentKey } from "@/lib/agents/definitions";

export const eventTypes = [
  "agent.started",
  "agent.completed",
  "agent.failed",
  "task.created",
  "task.completed",
  "approval.requested",
  "approval.approved",
  "approval.rejected",
  "model.call.logged",
  "budget.limit.hit",
] as const;

export type EventType = (typeof eventTypes)[number];

export type EventRecord = {
  id: string;
  workflowRunId: string;
  agentKey?: AgentKey;
  type: EventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CreateEventInput = Omit<EventRecord, "id" | "createdAt">;

export function isEventType(value: unknown): value is EventType {
  return typeof value === "string" && eventTypes.includes(value as EventType);
}

export function createEvent(input: CreateEventInput): EventRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}

const seedEvents: EventRecord[] = [
  createEvent({
    workflowRunId: "wf_phase_1_demo",
    agentKey: "ultron",
    type: "task.created",
    message: "Draft print-on-demand workflow created.",
    metadata: { dryRun: true },
  }),
  createEvent({
    workflowRunId: "wf_phase_1_demo",
    agentKey: "ultron",
    type: "agent.started",
    message: "Ultron started planning the dry-run workflow.",
    metadata: { model: "gpt-5.5" },
  }),
  createEvent({
    workflowRunId: "wf_phase_1_demo",
    agentKey: "trend-scout",
    type: "agent.completed",
    message: "Trend Scout completed mock niche research.",
    metadata: { source: "mock" },
  }),
  createEvent({
    workflowRunId: "wf_phase_1_demo",
    agentKey: "qa",
    type: "approval.requested",
    message: "Live publishing was blocked pending human approval.",
    metadata: { actionType: "LIVE_PRODUCT_PUBLISHING" },
  }),
];

const globalEventStore = globalThis as typeof globalThis & {
  nexusFactoryEvents?: EventRecord[];
};

function getStore() {
  globalEventStore.nexusFactoryEvents ??= [...seedEvents];
  return globalEventStore.nexusFactoryEvents;
}

export function resetEventsForTest(events: EventRecord[] = []) {
  globalEventStore.nexusFactoryEvents = [...events];
}

export function listEvents(workflowRunId?: string) {
  const events = getStore();
  const filtered = workflowRunId
    ? events.filter((event) => event.workflowRunId === workflowRunId)
    : events;

  return [...filtered].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function appendEvent(input: CreateEventInput) {
  const event = createEvent(input);
  getStore().push(event);
  return event;
}
