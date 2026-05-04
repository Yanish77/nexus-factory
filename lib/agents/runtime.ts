import type { AgentKey } from "@/lib/agents/definitions";
import { evaluateApproval, type RiskyAction } from "@/lib/approvals/policy";
import { appendEvent, createEvent, type EventRecord } from "@/lib/events/event-log";
import { routeModel, type RouteModelOptions } from "@/lib/models/router";
import { runDryRunTool } from "@/lib/tools/dry-run-tools";
import { agentRegistry } from "@/lib/agents/registry";
import type {
  AgentOutput,
  AgentRunInput,
  AgentRunRecord,
  ModelCallLogRecord,
} from "@/lib/agents/types";
import { toolRegistry, type ToolExecutionResult } from "@/lib/tools/registry";

export type AgentRuntimeInput = {
  workflowRunId: string;
  agentKey: AgentKey;
  businessId?: string;
  dryRun?: boolean;
  runInput: AgentRunInput;
  riskyAction?: RiskyAction;
  toolName?: string;
};

export type AgentRuntimeResult = {
  agentRun: AgentRunRecord;
  modelCallLog?: ModelCallLogRecord;
  output?: AgentOutput;
  toolResult?: ToolExecutionResult;
  events: EventRecord[];
};

function mockResponsesApiOutput(input: {
  agentKey: AgentKey;
  prompt: string;
  task: string;
  dryRun: boolean;
}): unknown {
  return {
    summary: `${input.agentKey} completed a dry-run response for: ${input.task}`,
    confidence: 0.82,
    artifacts: {
      providerShape: "openai-responses",
      dryRun: input.dryRun,
      promptPreview: input.prompt.slice(0, 120),
    },
    nextActions: ["Review the generated draft", "Keep all business actions in dry-run mode"],
  };
}

function createAgentRun(input: {
  workflowRunId: string;
  agentKey: AgentKey;
  dryRun: boolean;
  runInput: AgentRunInput;
}): AgentRunRecord {
  return {
    id: crypto.randomUUID(),
    workflowRunId: input.workflowRunId,
    agentKey: input.agentKey,
    status: "completed",
    dryRun: input.dryRun,
    input: input.runInput,
    createdAt: new Date().toISOString(),
  };
}

export function runAgent(input: AgentRuntimeInput): AgentRuntimeResult {
  const dryRun = input.dryRun ?? true;
  const agent = agentRegistry.get(input.agentKey);
  const agentRun = createAgentRun({
    workflowRunId: input.workflowRunId,
    agentKey: input.agentKey,
    dryRun,
    runInput: input.runInput,
  });
  const events: EventRecord[] = [];

  events.push(
    appendEvent({
      workflowRunId: input.workflowRunId,
      agentKey: input.agentKey,
      type: "agent.started",
      message: `${agent.name} started.`,
      metadata: {
        agentRunId: agentRun.id,
        dryRun,
      },
    }),
  );

  const routeOptions: RouteModelOptions = {
    agentKey: input.agentKey,
    workflowRunId: input.workflowRunId,
    businessId: input.businessId,
    requestedModel: input.runInput.requestedModel,
    taskKind: input.runInput.taskKind,
    confidence: input.runInput.confidence,
    riskyAction: input.riskyAction,
  };
  const route = routeModel(routeOptions);
  events.push(...route.events);

  if (!route.allowed) {
    agentRun.status = "blocked";
    agentRun.error = route.reason;
    agentRun.completedAt = new Date().toISOString();

    if (route.requiresApproval && input.riskyAction) {
      events.push(
        appendEvent({
          workflowRunId: input.workflowRunId,
          agentKey: route.targetAgentKey,
          type: "approval.requested",
          message: route.reason,
          metadata: {
            agentRunId: agentRun.id,
            actionType: input.riskyAction,
          },
        }),
      );
    }

    events.push(
      appendEvent({
        workflowRunId: input.workflowRunId,
        agentKey: input.agentKey,
        type: "agent.failed",
        message: `${agent.name} was blocked: ${route.reason}`,
        metadata: {
          agentRunId: agentRun.id,
          reason: route.reason,
        },
      }),
    );

    return {
      agentRun,
      events,
    };
  }

  const prompt = agent.buildPrompt(input.runInput);
  const rawOutput = mockResponsesApiOutput({
    agentKey: route.targetAgentKey,
    prompt,
    task: input.runInput.task,
    dryRun,
  });
  const output = agent.outputSchema.parse(rawOutput);
  const modelCallLog: ModelCallLogRecord = {
    id: crypto.randomUUID(),
    agentRunId: agentRun.id,
    workflowRunId: input.workflowRunId,
    agentKey: route.targetAgentKey,
    model: route.model,
    provider: "openai-responses",
    dryRun,
    input: prompt,
    output,
    createdAt: new Date().toISOString(),
  };

  let toolResult: ToolExecutionResult | undefined;
  if (input.toolName) {
    toolResult = toolRegistry.execute({
      workflowRunId: input.workflowRunId,
      agentKey: input.agentKey,
      toolName: input.toolName,
      dryRun,
      payload: {
        agentRunId: agentRun.id,
        output,
      },
    });

    if (toolResult.status === "blocked") {
      agentRun.status = "blocked";
      agentRun.error = toolResult.reason;
      events.push(
        appendEvent({
          workflowRunId: input.workflowRunId,
          agentKey: input.agentKey,
          type: "approval.requested",
          message: toolResult.reason,
          metadata: {
            agentRunId: agentRun.id,
            toolName: input.toolName,
          },
        }),
      );
    }
  }

  if (agentRun.status !== "blocked") {
    agentRun.status = "completed";
    agentRun.output = output;
    events.push(
      appendEvent({
        workflowRunId: input.workflowRunId,
        agentKey: input.agentKey,
        type: "agent.completed",
        message: `${agent.name} completed.`,
        metadata: {
          agentRunId: agentRun.id,
          modelCallLogId: modelCallLog.id,
        },
      }),
    );
  }

  agentRun.completedAt = new Date().toISOString();

  return {
    agentRun,
    modelCallLog,
    output,
    toolResult,
    events,
  };
}

export function runMockAgentAction(input: {
  workflowRunId: string;
  agentKey: AgentKey;
  purpose: string;
  riskyAction?: RiskyAction;
}) {
  const route = routeModel(input.agentKey);
  const events = [
    createEvent({
      workflowRunId: input.workflowRunId,
      agentKey: input.agentKey,
      type: "agent.started",
      message: `${input.agentKey} started ${input.purpose}.`,
      metadata: { model: route.model },
    }),
  ];

  if (input.riskyAction) {
    const approval = evaluateApproval(input.riskyAction);
    if (approval.requiresApproval) {
      events.push(
        createEvent({
          workflowRunId: input.workflowRunId,
          agentKey: input.agentKey,
          type: "approval.requested",
          message: approval.reason,
          metadata: { actionType: input.riskyAction },
        }),
      );

      return {
        status: "blocked" as const,
        modelRoute: route,
        toolCall: null,
        events,
      };
    }
  }

  const toolCall = runDryRunTool({
    workflowRunId: input.workflowRunId,
    agentKey: input.agentKey,
    toolName: "mock_business_action",
    payload: { purpose: input.purpose },
  });

  events.push(
    createEvent({
      workflowRunId: input.workflowRunId,
      agentKey: input.agentKey,
      type: "agent.completed",
      message: "Mock tool call completed in dry-run mode.",
      metadata: { toolName: toolCall.toolName, dryRun: toolCall.dryRun },
    }),
  );

  return {
    status: "completed" as const,
    modelRoute: route,
    toolCall,
    events,
  };
}
