import { appendEvent, type EventRecord } from "@/lib/events/event-log";
import { runAgent, type AgentRuntimeResult } from "@/lib/agents/runtime";

export type ProductNiche = {
  id: string;
  name: string;
  audience: string;
  rationale: string;
  score: number;
};

export type DesignBrief = {
  id: string;
  concept: string;
  prompt: string;
  placement: string;
};

export type DraftListing = {
  id: string;
  niche: ProductNiche;
  title: string;
  description: string;
  tags: string[];
  designBriefs: DesignBrief[];
  qa: {
    copyrightRisk: "low" | "medium" | "high";
    trademarkRisk: "low" | "medium" | "high";
    policyRisk: "low" | "medium" | "high";
    qualityRisk: "low" | "medium" | "high";
    notes: string[];
  };
  status: "draft" | "publish_requested" | "mock_published" | "blocked";
};

export type PublishApprovalRequest = {
  id: string;
  listingId: string;
  actionType: "LIVE_PRODUCT_PUBLISHING";
  status: "pending" | "approved" | "rejected";
  summary: string;
};

export type PodWorkflowResult = {
  workflowRunId: string;
  niches: ProductNiche[];
  selectedNiche: ProductNiche;
  designBriefs: DesignBrief[];
  draftListing: DraftListing;
  approvalRequest: PublishApprovalRequest;
  agentRuns: AgentRuntimeResult[];
  events: EventRecord[];
};

const defaultWorkflowRunId = "wf_pod_dry_run";

const niches: ProductNiche[] = [
  {
    id: "niche-1",
    name: "Retro pickleball club shirts",
    audience: "Recreational pickleball players",
    rationale: "Growing hobby with playful visual language and gift potential.",
    score: 91,
  },
  {
    id: "niche-2",
    name: "Bookish cat tote bags",
    audience: "Readers and library fans",
    rationale: "Evergreen gift niche with clear cozy aesthetic.",
    score: 88,
  },
  {
    id: "niche-3",
    name: "Minimal gardener mugs",
    audience: "Urban gardeners",
    rationale: "Simple slogans and botanical motifs fit POD products well.",
    score: 84,
  },
  {
    id: "niche-4",
    name: "Math teacher desk posters",
    audience: "STEM teachers",
    rationale: "Classroom decor niche with seasonal buying windows.",
    score: 79,
  },
  {
    id: "niche-5",
    name: "Dad joke grilling aprons",
    audience: "Backyard cooking fans",
    rationale: "Giftable, humorous, and suitable for draft-only mock listing tests.",
    score: 76,
  },
];

function emit(workflowRunId: string, event: Omit<EventRecord, "id" | "workflowRunId" | "createdAt">) {
  return appendEvent({
    workflowRunId,
    ...event,
  });
}

function buildDesignBriefs(selectedNiche: ProductNiche): DesignBrief[] {
  return [
    {
      id: "brief-1",
      concept: "Vintage club badge",
      prompt: `Retro badge design for ${selectedNiche.name}, limited palette, no brand references.`,
      placement: "Center chest",
    },
    {
      id: "brief-2",
      concept: "Minimal line art",
      prompt: `Clean line-art motif inspired by ${selectedNiche.audience}, friendly and original.`,
      placement: "Pocket print",
    },
    {
      id: "brief-3",
      concept: "Playful slogan layout",
      prompt: `Original slogan typography for ${selectedNiche.name}, high contrast, print ready.`,
      placement: "Full front",
    },
  ];
}

function buildDraftListing(selectedNiche: ProductNiche, designBriefs: DesignBrief[]): DraftListing {
  return {
    id: "draft-listing-pod-001",
    niche: selectedNiche,
    title: "Retro Pickleball Club Shirt - Original Court Crew Tee",
    description:
      "A draft-only print-on-demand listing for a playful retro pickleball shirt. This mock listing is not published and uses no real Etsy or Printify calls.",
    tags: [
      "pickleball shirt",
      "retro sports tee",
      "court crew",
      "pickleball gift",
      "club shirt",
      "sports hobby",
      "draft listing",
    ],
    designBriefs,
    qa: {
      copyrightRisk: "low",
      trademarkRisk: "low",
      policyRisk: "low",
      qualityRisk: "low",
      notes: [
        "Avoid official league, tournament, or brand references.",
        "Keep artwork original and generic.",
        "Listing remains draft-only until human approval.",
      ],
    },
    status: "publish_requested",
  };
}

const globalPodWorkflowStore = globalThis as typeof globalThis & {
  nexusFactoryLatestPodWorkflow?: PodWorkflowResult;
};

export function runDryRunPodWorkflow(workflowRunId = defaultWorkflowRunId): PodWorkflowResult {
  const events: EventRecord[] = [];
  const agentRuns: AgentRuntimeResult[] = [];

  events.push(
    emit(workflowRunId, {
      agentKey: "ultron",
      type: "task.created",
      message: "Dry-run print-on-demand workflow created.",
      metadata: { dryRun: true },
    }),
  );

  agentRuns.push(
    runAgent({
      workflowRunId,
      agentKey: "trend-scout",
      runInput: {
        task: "Propose 5 print-on-demand product niches.",
        taskKind: "research",
      },
    }),
  );
  events.push(
    emit(workflowRunId, {
      agentKey: "trend-scout",
      type: "agent.completed",
      message: "Trend Scout proposed 5 product niches.",
      metadata: { niches },
    }),
  );

  const selectedNiche = niches[0];
  agentRuns.push(
    runAgent({
      workflowRunId,
      agentKey: "ultron",
      runInput: {
        task: `Select or reject a niche from ${niches.length} proposals.`,
        taskKind: "supervision",
      },
    }),
  );
  events.push(
    emit(workflowRunId, {
      agentKey: "ultron",
      type: "agent.completed",
      message: `Ultron selected niche: ${selectedNiche.name}.`,
      metadata: { selectedNicheId: selectedNiche.id },
    }),
  );

  const designBriefs = buildDesignBriefs(selectedNiche);
  agentRuns.push(
    runAgent({
      workflowRunId,
      agentKey: "design-brief",
      runInput: {
        task: "Create 3 design briefs for the selected niche.",
        taskKind: "design",
      },
    }),
  );
  events.push(
    emit(workflowRunId, {
      agentKey: "design-brief",
      type: "agent.completed",
      message: "Design Brief Agent created 3 design briefs.",
      metadata: { designBriefs },
    }),
  );

  agentRuns.push(
    runAgent({
      workflowRunId,
      agentKey: "listing-writer",
      runInput: {
        task: "Create a draft listing title, description, and tags.",
        taskKind: "copy",
      },
    }),
  );
  events.push(
    emit(workflowRunId, {
      agentKey: "listing-writer",
      type: "agent.completed",
      message: "Listing Writer created title, description, and tags.",
      metadata: {
        title: "Retro Pickleball Club Shirt - Original Court Crew Tee",
      },
    }),
  );

  const draftListing = buildDraftListing(selectedNiche, designBriefs);
  agentRuns.push(
    runAgent({
      workflowRunId,
      agentKey: "qa",
      runInput: {
        task: "Check copyright, trademark, policy, and quality risk.",
        taskKind: "qa",
      },
    }),
  );
  events.push(
    emit(workflowRunId, {
      agentKey: "qa",
      type: "agent.completed",
      message: "QA Agent checked copyright, trademark, policy, and quality risk.",
      metadata: draftListing.qa,
    }),
  );

  events.push(
    emit(workflowRunId, {
      agentKey: "store-ops",
      type: "task.completed",
      message: "System created a draft listing object. Nothing has been published.",
      metadata: { listingId: draftListing.id, status: draftListing.status },
    }),
  );

  const approvalRequest: PublishApprovalRequest = {
    id: "approval-publish-pod-001",
    listingId: draftListing.id,
    actionType: "LIVE_PRODUCT_PUBLISHING",
    status: "pending",
    summary: "Approve mock publishing for the draft listing. Real publishing remains disabled.",
  };
  events.push(
    emit(workflowRunId, {
      agentKey: "store-ops",
      type: "approval.requested",
      message: "Approval inbox received a publish request.",
      metadata: approvalRequest,
    }),
  );

  const result: PodWorkflowResult = {
    workflowRunId,
    niches,
    selectedNiche,
    designBriefs,
    draftListing,
    approvalRequest,
    agentRuns,
    events,
  };
  globalPodWorkflowStore.nexusFactoryLatestPodWorkflow = result;

  return result;
}

export function getLatestPodWorkflow() {
  globalPodWorkflowStore.nexusFactoryLatestPodWorkflow ??= runDryRunPodWorkflow();
  return globalPodWorkflowStore.nexusFactoryLatestPodWorkflow;
}

export function getLatestDraftListing() {
  return getLatestPodWorkflow().draftListing;
}

export function getLatestPublishApproval() {
  return getLatestPodWorkflow().approvalRequest;
}

export function approvePublishRequest(input: {
  approvalId: string;
  liveMode?: boolean;
}) {
  const workflow = getLatestPodWorkflow();
  const approved = input.approvalId === workflow.approvalRequest.id;
  const liveMode = input.liveMode ?? process.env.LIVE_MODE === "true";

  if (!approved) {
    return {
      status: "rejected" as const,
      connector: "none",
      message: "Approval request was not found.",
    };
  }

  if (!liveMode) {
    workflow.approvalRequest.status = "approved";
    workflow.draftListing.status = "mock_published";
    appendEvent({
      workflowRunId: workflow.workflowRunId,
      agentKey: "store-ops",
      type: "approval.approved",
      message: "Publish request approved. Mock connector used because LIVE_MODE is not true.",
      metadata: {
        listingId: workflow.draftListing.id,
        connector: "mock",
      },
    });

    return {
      status: "mock_published" as const,
      connector: "mock",
      message: "Approved with mock connector. No real Etsy or Printify call was made.",
    };
  }

  workflow.draftListing.status = "blocked";
  appendEvent({
    workflowRunId: workflow.workflowRunId,
    agentKey: "store-ops",
    type: "agent.failed",
    message: "LIVE_MODE=true requested, but real business connectors are not implemented.",
    metadata: {
      listingId: workflow.draftListing.id,
      connector: "none",
    },
  });

  return {
    status: "blocked" as const,
    connector: "none",
    message: "LIVE_MODE=true is set, but real publishing is not implemented in this phase.",
  };
}
