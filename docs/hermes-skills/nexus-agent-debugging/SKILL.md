# Nexus Agent Debugging

## When To Use

Use this skill when an agent appears stuck, failed, noisy, over budget, or out of policy.

## Exact Procedure

1. Call `get_agent_status`.
2. Call `get_today_events`.
3. Filter events related to the affected agent or workflow.
4. Identify likely failure points, missing approvals, budget caps, or routing issues.
5. If the issue is active and safe to pause, call `pause_agent` only at supervised autonomy.
6. Create an internal task with reproduction notes.
7. Request Ultron review for policy, budget, approval, or supervisor decisions.
8. Return structured JSON only.

## Allowed Nexus Tools

- `get_agent_status`
- `get_today_events`
- `get_cost_summary`
- `create_internal_task`
- `request_ultron_review`
- `pause_agent`

## Forbidden Actions

- Patch code, deploy production, change credentials, change model routing, increase autonomy, delete data, or bypass approvals.
- Publish, spend money, refund, or message customers.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-agent-debugging",
  "status": "ok",
  "agent": "agent-key-or-unknown",
  "symptoms": [],
  "likelyCauses": [],
  "eventsReviewed": 0,
  "pausedAgent": false,
  "createdTasks": [],
  "ultronReviewRequested": false
}
```

## Safety Checks

- Pause only when explicitly supported and within current autonomy.
- Prefer internal tasks over direct fixes.
- Do not modify production systems or credentials.
- Keep all findings auditable through events.

## Example Prompt

Debug why the QA Agent appears stuck. Review today’s events, summarize likely causes, create an internal task if needed, and request Ultron review for risky decisions.
