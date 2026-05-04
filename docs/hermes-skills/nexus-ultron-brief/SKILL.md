# Nexus Ultron Brief

## When To Use

Use this skill to prepare a concise supervisor brief for Ultron before a review, approval decision, or planning session.

## Exact Procedure

1. Call `get_today_events`.
2. Call `get_agent_status`.
3. Call `get_pending_approvals`.
4. Call `get_cost_summary`.
5. Summarize key events, open risks, budget posture, and approval needs.
6. Call `request_ultron_review` with a short reason.
7. Return structured JSON only.

## Allowed Nexus Tools

- `get_today_events`
- `get_agent_status`
- `get_pending_approvals`
- `get_cost_summary`
- `request_ultron_review`

## Forbidden Actions

- Make decisions on Ultron’s behalf.
- Approve, reject, publish, spend money, refund, message customers, deploy production, change credentials, delete data, or bypass approvals.
- Route non-Ultron agents to `gpt-5.5`.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-ultron-brief",
  "status": "ok",
  "briefTitle": "Brief title",
  "keyEvents": [],
  "risks": [],
  "approvalNeeds": [],
  "budgetStatus": "within_limit",
  "ultronReviewRequested": true
}
```

## Safety Checks

- Keep the brief factual and concise.
- Separate observed facts from recommendations.
- Do not include secrets or raw credentials.
- Escalate decisions; do not execute them.

## Example Prompt

Prepare an Ultron brief for today’s Nexus activity. Include key events, risks, approvals, and budget posture, then request Ultron review.
