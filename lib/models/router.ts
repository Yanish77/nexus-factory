import { findAgent, type AgentKey } from "@/lib/agents/definitions";

export type ModelRoute = {
  agentKey: AgentKey;
  model: string;
  allowed: boolean;
  reason: string;
};

export const PREMIUM_MODEL = "gpt-5.5";
export const SPECIALIST_DEFAULT_MODEL = "gpt-5.4-mini";

export function routeModel(agentKey: AgentKey, requestedModel?: string): ModelRoute {
  const agent = findAgent(agentKey);
  const model = requestedModel ?? agent.defaultModel;

  if (model === PREMIUM_MODEL && !agent.canUsePremiumModel) {
    return {
      agentKey,
      model,
      allowed: false,
      reason: "Only Ultron may use gpt-5.5.",
    };
  }

  return {
    agentKey,
    model,
    allowed: true,
    reason: "Model route allowed.",
  };
}
