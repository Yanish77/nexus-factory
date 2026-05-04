import type { AgentRunRecord, ModelCallLogRecord } from "@/lib/agents/types";
import type { PublishApprovalRequest } from "@/lib/workflows/pod-workflow";

export type TaskRecord = {
  id: string;
  workflowRunId: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed";
  source: "dashboard" | "api" | "worker" | "hermes";
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

const globalRuntimeStore = globalThis as typeof globalThis & {
  nexusTasks?: TaskRecord[];
  nexusAgentRuns?: AgentRunRecord[];
  nexusModelCallLogs?: ModelCallLogRecord[];
  nexusApprovalRequests?: PublishApprovalRequest[];
};

export function resetRuntimeStoreForTest() {
  globalRuntimeStore.nexusTasks = [];
  globalRuntimeStore.nexusAgentRuns = [];
  globalRuntimeStore.nexusModelCallLogs = [];
  globalRuntimeStore.nexusApprovalRequests = [];
}

function tasks() {
  globalRuntimeStore.nexusTasks ??= [];
  return globalRuntimeStore.nexusTasks;
}

function agentRuns() {
  globalRuntimeStore.nexusAgentRuns ??= [];
  return globalRuntimeStore.nexusAgentRuns;
}

function modelCallLogs() {
  globalRuntimeStore.nexusModelCallLogs ??= [];
  return globalRuntimeStore.nexusModelCallLogs;
}

function approvalRequests() {
  globalRuntimeStore.nexusApprovalRequests ??= [];
  return globalRuntimeStore.nexusApprovalRequests;
}

export function createTask(input: Omit<TaskRecord, "id" | "createdAt" | "updatedAt">) {
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  tasks().unshift(task);
  return task;
}

export function updateTaskStatus(id: string, status: TaskRecord["status"], metadata?: Record<string, unknown>) {
  const task = tasks().find((candidate) => candidate.id === id);
  if (!task) {
    return undefined;
  }

  task.status = status;
  task.updatedAt = new Date().toISOString();
  task.metadata = {
    ...task.metadata,
    ...metadata,
  };
  return task;
}

export function listTasks() {
  return [...tasks()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function addAgentRun(record: AgentRunRecord) {
  agentRuns().unshift(record);
}

export function listAgentRuns(workflowRunId?: string) {
  const records = workflowRunId
    ? agentRuns().filter((record) => record.workflowRunId === workflowRunId)
    : agentRuns();
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function addModelCallLog(record: ModelCallLogRecord) {
  modelCallLogs().unshift(record);
}

export function listModelCallLogs(workflowRunId?: string) {
  const records = workflowRunId
    ? modelCallLogs().filter((record) => record.workflowRunId === workflowRunId)
    : modelCallLogs();
  return [...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function addApprovalRequest(request: PublishApprovalRequest) {
  const store = approvalRequests();
  if (!store.some((candidate) => candidate.id === request.id)) {
    store.unshift(request);
  }
}

export function listApprovalRequests() {
  return [...approvalRequests()];
}
