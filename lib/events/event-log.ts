import type { AgentKey } from "@/lib/agents/definitions";
import { hasDatabaseUrl, getPrismaClient } from "@/lib/db/prisma";

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

const prismaEventTypeByRecordType: Record<EventType, string> = {
  "agent.started": "AGENT_STARTED",
  "agent.completed": "AGENT_COMPLETED",
  "agent.failed": "AGENT_FAILED",
  "task.created": "TASK_CREATED",
  "task.completed": "TASK_COMPLETED",
  "approval.requested": "APPROVAL_REQUESTED",
  "approval.approved": "APPROVAL_APPROVED",
  "approval.rejected": "APPROVAL_REJECTED",
  "model.call.logged": "MODEL_CALL_LOGGED",
  "budget.limit.hit": "BUDGET_LIMIT_HIT",
};

const recordTypeByPrismaEventType = Object.fromEntries(
  Object.entries(prismaEventTypeByRecordType).map(([recordType, prismaType]) => [prismaType, recordType]),
) as Record<string, EventType>;

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

function toPrismaEventType(type: EventType) {
  return prismaEventTypeByRecordType[type];
}

function fromPrismaEvent(event: {
  id: string;
  workflowRunId: string;
  agent?: { key: string } | null;
  type: string;
  message: string;
  metadataJson: unknown;
  createdAt: Date;
}): EventRecord {
  return {
    id: event.id,
    workflowRunId: event.workflowRunId,
    agentKey: toAgentKey(event.agent?.key),
    type: recordTypeByPrismaEventType[event.type] ?? "task.created",
    message: event.message,
    metadata: isRecord(event.metadataJson) ? event.metadataJson : {},
    createdAt: event.createdAt.toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toAgentKey(value: string | undefined): AgentKey | undefined {
  const knownAgentKeys: AgentKey[] = [
    "ultron",
    "trend-scout",
    "listing-writer",
    "design-brief",
    "qa",
    "store-ops",
  ];

  return knownAgentKeys.includes(value as AgentKey) ? (value as AgentKey) : undefined;
}

async function ensureWorkflowAndAgent(input: CreateEventInput) {
  const prisma = getPrismaClient();
  await prisma.workflowRun.upsert({
    where: { id: input.workflowRunId },
    create: {
      id: input.workflowRunId,
      name: input.workflowRunId,
      status: "RUNNING",
      dryRun: true,
    },
    update: {},
  });

  if (!input.agentKey) {
    return undefined;
  }

  return prisma.agent.upsert({
    where: { key: input.agentKey },
    create: {
      key: input.agentKey,
      name: input.agentKey,
      role: "Runtime agent",
      defaultModel: input.agentKey === "ultron" ? "gpt-5.5" : "gpt-5.4-mini",
      canUsePremiumModel: input.agentKey === "ultron",
    },
    update: {},
  });
}

async function persistEvent(event: EventRecord) {
  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    const agent = await ensureWorkflowAndAgent(event);
    await getPrismaClient().event.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        workflowRunId: event.workflowRunId,
        agentId: agent?.id,
        type: toPrismaEventType(event.type) as never,
        message: event.message,
        metadataJson: event.metadata,
        createdAt: new Date(event.createdAt),
      },
      update: {},
    });
  } catch {
    // Keep the in-memory audit log available if the database is offline.
  }
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
  void persistEvent(event);
  return event;
}

export async function listEventsFromDatabase(workflowRunId?: string): Promise<EventRecord[]> {
  if (!hasDatabaseUrl()) {
    return listEvents(workflowRunId);
  }

  try {
    const events = await getPrismaClient().event.findMany({
      where: workflowRunId ? { workflowRunId } : undefined,
      include: { agent: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (events.length === 0) {
      return listEvents(workflowRunId);
    }

    return events.map(fromPrismaEvent);
  } catch {
    return listEvents(workflowRunId);
  }
}
