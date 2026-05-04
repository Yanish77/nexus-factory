import type { AgentKey } from "@/lib/agents/definitions";
import type { RiskyAction } from "@/lib/approvals/policy";
import { runDryRunTool, type ToolCallRecord } from "@/lib/tools/dry-run-tools";

export type ToolDefinition = {
  name: string;
  description: string;
  riskyAction?: RiskyAction;
};

export type ToolExecutionInput = {
  workflowRunId: string;
  agentKey: AgentKey;
  toolName: string;
  dryRun: boolean;
  payload: Record<string, unknown>;
};

export type ToolExecutionResult =
  | {
      status: "completed";
      toolCall: ToolCallRecord;
    }
  | {
      status: "blocked";
      reason: string;
      toolCall: ToolCallRecord;
    };

const toolDefinitions: ToolDefinition[] = [
  {
    name: "mock_trend_research",
    description: "Produces mock market research for draft-only workflows.",
  },
  {
    name: "mock_listing_draft",
    description: "Produces mock listing copy drafts.",
  },
  {
    name: "mock_design_brief",
    description: "Produces mock print-on-demand design briefs.",
  },
  {
    name: "mock_quality_review",
    description: "Produces mock policy and quality review notes.",
  },
  {
    name: "mock_store_ops_draft",
    description: "Produces mock store operations drafts.",
  },
  {
    name: "live_publish_product",
    description: "Blocked in Phase 1. Would publish a product in a live integration.",
    riskyAction: "LIVE_PRODUCT_PUBLISHING",
  },
];

export class ToolRegistry {
  private readonly tools = new Map(toolDefinitions.map((tool) => [tool.name, tool]));

  get(toolName: string) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool is not registered: ${toolName}`);
    }

    return tool;
  }

  list() {
    return [...this.tools.values()];
  }

  execute(input: ToolExecutionInput): ToolExecutionResult {
    const tool = this.get(input.toolName);

    if (!input.dryRun || tool.riskyAction) {
      return {
        status: "blocked",
        reason: tool.riskyAction
          ? `${tool.riskyAction} requires human approval and is disabled in Phase 1.`
          : "Live tool execution is disabled in Phase 1.",
        toolCall: {
          id: crypto.randomUUID(),
          workflowRunId: input.workflowRunId,
          agentKey: input.agentKey,
          toolName: input.toolName,
          dryRun: input.dryRun,
          input: input.payload,
          output: { blocked: true, phase: 1 },
          status: "blocked",
        },
      };
    }

    return {
      status: "completed",
      toolCall: runDryRunTool({
        workflowRunId: input.workflowRunId,
        agentKey: input.agentKey,
        toolName: input.toolName,
        payload: input.payload,
      }),
    };
  }
}

export const toolRegistry = new ToolRegistry();
