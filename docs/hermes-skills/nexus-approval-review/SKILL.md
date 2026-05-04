# Nexus Approval Review

## When To Use

Use this skill when the human approval inbox needs a concise risk review.

## Exact Procedure

1. Call `get_pending_approvals`.
2. Call `get_today_events`.
3. Group approvals by action type and risk.
4. Confirm no approval has already executed automatically.
5. Create an internal task if context is missing.
6. Request Ultron review for high-risk approvals.
7. Return structured JSON only.

## Allowed Nexus Tools

- `get_pending_approvals`
- `get_today_events`
- `create_internal_task`
- `request_ultron_review`

## Forbidden Actions

- Approve or reject approvals directly.
- Publish listings, spend money, send customer messages, refund customers, deploy production, change credentials, delete data, or bypass approvals.
- Change autonomy levels above the current allowed level.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-approval-review",
  "status": "ok",
  "pendingCount": 0,
  "approvalSummaries": [],
  "highRiskItems": [],
  "missingContext": [],
  "createdTasks": [],
  "ultronReviewRequested": false
}
```

## Safety Checks

- Confirm approval requests remain pending.
- Do not execute the requested business action.
- Do not claim an approval is safe without citing the available context.
- Escalate unclear or high-risk items to Ultron.

## Example Prompt

Review the pending Nexus approvals. Summarize risk, missing context, and which items need Ultron review. Do not approve or reject anything.
