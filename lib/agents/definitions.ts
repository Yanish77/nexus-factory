export type AgentKey =
  | "ultron"
  | "trend-scout"
  | "listing-writer"
  | "design-brief"
  | "qa"
  | "store-ops";

export type AgentDefinition = {
  key: AgentKey;
  name: string;
  role: string;
  defaultModel: string;
  canUsePremiumModel: boolean;
};

export const agents: AgentDefinition[] = [
  {
    key: "ultron",
    name: "Ultron",
    role: "Supervisor",
    defaultModel: "gpt-5.5",
    canUsePremiumModel: true,
  },
  {
    key: "trend-scout",
    name: "Trend Scout",
    role: "Researches draft-only market opportunities",
    defaultModel: "gpt-5.4-mini",
    canUsePremiumModel: false,
  },
  {
    key: "listing-writer",
    name: "Listing Writer",
    role: "Drafts listing titles, descriptions, and tags",
    defaultModel: "gpt-5.4-mini",
    canUsePremiumModel: false,
  },
  {
    key: "design-brief",
    name: "Design Brief Agent",
    role: "Creates print-on-demand design briefs",
    defaultModel: "gpt-5.4-mini",
    canUsePremiumModel: false,
  },
  {
    key: "qa",
    name: "QA Agent",
    role: "Reviews policy, copyright, and quality risks",
    defaultModel: "gpt-5.4-mini",
    canUsePremiumModel: false,
  },
  {
    key: "store-ops",
    name: "Store Ops Agent",
    role: "Prepares store operation drafts",
    defaultModel: "gpt-5.4-mini",
    canUsePremiumModel: false,
  },
];

export function findAgent(key: AgentKey) {
  const agent = agents.find((candidate) => candidate.key === key);
  if (!agent) {
    throw new Error(`Unknown agent: ${key}`);
  }

  return agent;
}
