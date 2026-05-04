import { beforeEach, describe, expect, it } from "vitest";
import { listEvents, resetEventsForTest } from "@/lib/events/event-log";
import {
  approvePublishRequest,
  runDryRunPodWorkflow,
} from "@/lib/workflows/pod-workflow";

describe("dry-run print-on-demand workflow", () => {
  beforeEach(() => {
    resetEventsForTest();
  });

  it("runs the complete POD workflow and creates a draft listing plus publish approval", () => {
    const result = runDryRunPodWorkflow("wf_full_pod_test");

    expect(result.niches).toHaveLength(5);
    expect(result.selectedNiche).toEqual(result.niches[0]);
    expect(result.designBriefs).toHaveLength(3);
    expect(result.draftListing.title).toBeTruthy();
    expect(result.draftListing.description).toContain("draft-only");
    expect(result.draftListing.tags.length).toBeGreaterThan(0);
    expect(result.draftListing.qa.copyrightRisk).toBe("low");
    expect(result.draftListing.qa.trademarkRisk).toBe("low");
    expect(result.draftListing.qa.policyRisk).toBe("low");
    expect(result.draftListing.qa.qualityRisk).toBe("low");
    expect(result.draftListing.status).toBe("publish_requested");
    expect(result.approvalRequest.actionType).toBe("LIVE_PRODUCT_PUBLISHING");
    expect(result.approvalRequest.status).toBe("pending");
  });

  it("shows every major step in the Deep Comms event feed", () => {
    runDryRunPodWorkflow("wf_deep_comms_test");
    const messages = listEvents("wf_deep_comms_test").map((event) => event.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        "Dry-run print-on-demand workflow created.",
        "Trend Scout proposed 5 product niches.",
        "Ultron selected niche: Retro pickleball club shirts.",
        "Design Brief Agent created 3 design briefs.",
        "Listing Writer created title, description, and tags.",
        "QA Agent checked copyright, trademark, policy, and quality risk.",
        "System created a draft listing object. Nothing has been published.",
        "Approval inbox received a publish request.",
      ]),
    );
  });

  it("does not publish before approval", () => {
    const result = runDryRunPodWorkflow("wf_no_publish_test");

    expect(result.approvalRequest.status).toBe("pending");
    expect(result.draftListing.status).toBe("publish_requested");
  });

  it("uses the mock connector after approval unless LIVE_MODE is true", () => {
    const result = runDryRunPodWorkflow("wf_mock_publish_test");
    const publishResult = approvePublishRequest({
      approvalId: result.approvalRequest.id,
      liveMode: false,
    });

    expect(publishResult.status).toBe("mock_published");
    expect(publishResult.connector).toBe("mock");
    expect(publishResult.message).toContain("No real Etsy or Printify call");
  });

  it("still blocks real publishing when LIVE_MODE is true because live connectors are not implemented", () => {
    const result = runDryRunPodWorkflow("wf_live_block_test");
    const publishResult = approvePublishRequest({
      approvalId: result.approvalRequest.id,
      liveMode: true,
    });

    expect(publishResult.status).toBe("blocked");
    expect(publishResult.connector).toBe("none");
  });
});
