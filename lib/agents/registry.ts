import { z } from "zod";
import { agents } from "@/lib/agents/definitions";
import type { Agent, AgentOutput } from "@/lib/agents/types";

export const agentOutputSchema = z.object({
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  artifacts: z.record(z.string(), z.unknown()),
  nextActions: z.array(z.string()),
}) satisfies z.ZodType<AgentOutput>;

function createAgent(definition: (typeof agents)[number]): Agent {
  return {
    key: definition.key,
    name: definition.name,
    role: definition.role,
    outputSchema: agentOutputSchema,
    buildPrompt(input) {
      return [
        `Agent: ${definition.name}`,
        `Role: ${definition.role}`,
        `Task: ${input.task}`,
        "Return structured JSON with summary, confidence, artifacts, and nextActions.",
      ].join("\n");
    },
  };
}

export class AgentRegistry {
  private readonly agents = new Map(agents.map((definition) => [definition.key, createAgent(definition)]));

  get(agentKey: (typeof agents)[number]["key"]) {
    const agent = this.agents.get(agentKey);
    if (!agent) {
      throw new Error(`Agent is not registered: ${agentKey}`);
    }

    return agent;
  }

  list() {
    return [...this.agents.values()];
  }
}

export const agentRegistry = new AgentRegistry();
