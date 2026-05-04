# Nexus Token Review

## When To Use

Use this skill to review model call volume, estimated spend, budget caps, and routing concerns.

## Exact Procedure

1. Call `get_cost_summary`.
2. Call `get_today_events`.
3. Look for `model.call.logged` and `budget.limit.hit` events.
4. Flag any possible overuse, repeated failures, or expensive routing.
5. Create an internal task if budget follow-up is needed.
6. Request Ultron review if budget limits are hit or `gpt-5.5` use looks suspicious.
7. Return structured JSON only.

## Allowed Nexus Tools

- `get_cost_summary`
- `get_today_events`
- `create_internal_task`
- `request_ultron_review`

## Forbidden Actions

- Change model routing.
- Raise budgets.
- Use or request raw API keys.
- Publish, spend money, refund, message customers, deploy production, delete data, or bypass approvals.

## Expected Structured JSON Output

```json
{
  "skill": "nexus-token-review",
  "status": "ok",
  "estimatedCost": 0,
  "budgetLimit": 0,
  "budgetStatus": "within_limit",
  "routingConcerns": [],
  "createdTasks": [],
  "ultronReviewRequested": false,
  "recommendations": []
}
```

## Safety Checks

- Treat all spend data as audit-only.
- Never change budgets or model routing directly.
- Verify non-Ultron `gpt-5.5` usage is flagged for Ultron review.
- Keep output free of secrets and raw credentials.

## Example Prompt

Run a Nexus token and cost review. Check model usage, budget pressure, and routing concerns. Flag anything that needs Ultron review.
