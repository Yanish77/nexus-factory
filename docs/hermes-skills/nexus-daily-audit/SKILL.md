# Nexus Daily Audit

## When To Use

Use this skill once per work session or day to summarize Nexus Factory health, recent activity, approvals, agent status, and cost posture.

## Exact Procedure

1. Call `get_agent_status`.
2. Call `get_today_events`.
3. Call `get_cost_summary`.
4. Call `get_pending_approvals`.
5. Identify blocked, failed, risky, or unusually quiet agents.
6. Create one internal task only if follow-up work is needed.
7. Request Ultron review if the audit finds risk, failed runs, budget pressure, or pending approvals.
8. Return structured JSON only.

## Allowed Nexus Tools

- `get_agent_status`
- `get_today_events`
- `get_cost_summary`
- `get_pending_approvals`
- `create_internal_task`
- `request_ultron_review`

## Forbidden Actions

- Publish listings.
- Spend money.
- Send customer messages.
- Refund customers.
- Change credentials, model routing, store settings, deployments, or autonomy levels.
- Delete data or bypass approvals.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-daily-audit",
  "status": "ok",
  "summary": "Short audit summary.",
  "risks": [],
  "pendingApprovals": 0,
  "budgetStatus": "within_limit",
  "createdTasks": [],
  "ultronReviewRequested": false,
  "nextActions": []
}
```

## Safety Checks

- Confirm all reported actions are dry-run or internal-only.
- Do not include secrets, tokens, raw credentials, or private API responses.
- Do not execute approval-gated actions.
- Escalate risk to Ultron instead of acting directly.

## Example Prompt

Run the Nexus Daily Audit for today. Summarize agent health, recent Deep Comms activity, approvals, and budget posture. Create internal tasks only for clear follow-up items.
