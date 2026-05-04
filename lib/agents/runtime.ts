import type { AgentKey } from "@/lib/agents/definitions";
import { evaluateApproval, type RiskyAction } from "@/lib/approvals/policy";
import { createEvent } from "@/lib/events/event-log";
import { routeModel } from "@/lib/models/router";
import { runDryRunTool } from "@/lib/tools/dry-run-tools";

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
