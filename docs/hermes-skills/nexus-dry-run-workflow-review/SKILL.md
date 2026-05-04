# Nexus Dry-Run Workflow Review

## When To Use

Use this skill after a dry-run business workflow completes or reaches an approval gate.

## Exact Procedure

1. Call `get_today_events`.
2. Call `get_pending_approvals`.
3. Call `get_agent_status`.
4. Confirm the workflow stayed in dry-run mode.
5. Confirm no live connector action executed.
6. Identify failed, skipped, blocked, or approval-gated steps.
7. Create an approval request only if a human review gate is missing.
8. Create internal tasks for follow-up fixes.
9. Request Ultron review for risky or unclear outcomes.
10. Return structured JSON only.

## Allowed Nexus Tools

- `get_today_events`
- `get_pending_approvals`
- `get_agent_status`
- `create_internal_task`
- `create_approval_request`
- `request_ultron_review`

## Forbidden Actions

- Publish listings.
- Call live Etsy, Printify, payment, email, deployment, or production database systems.
- Spend money, refund customers, message customers, change credentials, delete data, or bypass approvals.
- Change autonomy above the current allowed level.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-dry-run-workflow-review",
  "status": "ok",
  "workflowId": "workflow-or-unknown",
  "dryRunConfirmed": true,
  "liveActionsDetected": false,
  "stepsReviewed": [],
  "approvalGates": [],
  "createdTasks": [],
  "createdApprovalRequests": [],
  "ultronReviewRequested": false
}
```

## Safety Checks

- Treat any live external action as a critical finding.
- Do not publish or call business connectors.
- Approval requests must remain pending and must not execute actions automatically.
- Keep all recommendations auditable through Nexus events.

## Example Prompt

Review the latest dry-run print-on-demand workflow. Confirm dry-run behavior, list blocked or approval-gated steps, and create internal follow-up tasks only where needed.
